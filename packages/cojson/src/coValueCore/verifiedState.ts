import { Result, err, ok } from "neverthrow";
import { AnyRawCoValue } from "../coValue.js";
import {
  CryptoProvider,
  Encrypted,
  Hash,
  KeyID,
  KeySecret,
  Signature,
  SignerID,
  StreamingHash,
} from "../crypto/crypto.js";
import { RawCoID, SessionID, TransactionID } from "../ids.js";
import { stableStringify, Stringified } from "../jsonStringify.js";
import { JsonObject, JsonValue } from "../jsonValue.js";
import { PermissionsDef as RulesetDef } from "../permissions.js";
import { getPriorityFromHeader } from "../priority.js";
import { CoValueKnownState, NewContentMessage } from "../sync.js";
import {
  InvalidHashError,
  InvalidSignatureError,
  MAX_RECOMMENDED_TX_SIZE,
} from "./coValueCore.js";
import { TryAddTransactionsError } from "./coValueCore.js";
import { SessionLog as WasmSessionLog } from "cojson-core-wasm";
import { ControlledAccountOrAgent } from "../coValues/account.js";

export type CoValueHeader = {
  type: AnyRawCoValue["type"];
  ruleset: RulesetDef;
  meta: JsonObject | null;
} & CoValueUniqueness;

export type CoValueUniqueness = {
  uniqueness: JsonValue;
  createdAt?: `2${string}` | null;
};

export type PrivateTransaction = {
  privacy: "private";
  madeAt: number;
  keyUsed: KeyID;
  encryptedChanges: Encrypted<JsonValue[], { in: RawCoID; tx: TransactionID }>;
};

export type TrustingTransaction = {
  privacy: "trusting";
  madeAt: number;
  changes: Stringified<JsonValue[]>;
};

export type Transaction = PrivateTransaction | TrustingTransaction;

// type SessionLog = {
//   readonly transactions: Transaction[];
//   lastHash?: Hash;
//   streamingHash: StreamingHash;
//   readonly signatureAfter: { [txIdx: number]: Signature | undefined };
//   lastSignature: Signature;
// };

type SessionLog = {
  signerID: SignerID;
  wasm: WasmSessionLog;
  transactions: Transaction[];
  lastSignature: Signature | undefined;
  // lastHash: Hash | undefined;
  signatureAfter: { [txIdx: number]: Signature | undefined };
};

export type ValidatedSessions = Map<SessionID, SessionLog>;

export class VerifiedState {
  readonly id: RawCoID;
  readonly crypto: CryptoProvider;
  readonly header: CoValueHeader;
  readonly sessions: ValidatedSessions;
  private _cachedKnownState?: CoValueKnownState;
  private _cachedNewContentSinceEmpty: NewContentMessage[] | undefined;

  constructor(
    id: RawCoID,
    crypto: CryptoProvider,
    header: CoValueHeader,
    sessions: ValidatedSessions,
  ) {
    this.id = id;
    this.crypto = crypto;
    this.header = header;
    this.sessions = sessions;
  }

  clone(): VerifiedState {
    // do a deep clone, including the sessions
    const clonedSessions = new Map();
    for (let [sessionID, sessionLog] of this.sessions) {
      clonedSessions.set(sessionID, {
        wasm: sessionLog.wasm.clone(),
        transactions: sessionLog.transactions.slice(),
        lastSignature: sessionLog.lastSignature,
        // lastHash: sessionLog.lastHash,
        signatureAfter: {...sessionLog.signatureAfter},
      });
    }
    return new VerifiedState(this.id, this.crypto, this.header, clonedSessions);
  }

  tryAddTransactions(
    sessionID: SessionID,
    signerID: SignerID,
    newTransactions: Transaction[],
    givenExpectedNewHash: Hash | undefined,
    newSignature: Signature,
    skipVerify: boolean = false,
    givenNewStreamingHash?: StreamingHash,
  ): Result<true, TryAddTransactionsError> {
    let sessionLog = this.sessions.get(sessionID);
    if (!sessionLog) {
      sessionLog = {
        signerID,
        wasm: new WasmSessionLog(this.id, sessionID, signerID),
        transactions: [],
        lastSignature: undefined,
        // lastHash: undefined,
        signatureAfter: {},
      };
      this.sessions.set(sessionID, sessionLog);
    }

    try {
      const _newHash = sessionLog.wasm.tryAdd(newTransactions.map(tx => stableStringify(tx)), newSignature, skipVerify);

      sessionLog.transactions.push(...newTransactions);
      sessionLog.lastSignature = newSignature;
      // sessionLog.lastHash = newHash as Hash;

      this._cachedNewContentSinceEmpty = undefined;
      this._cachedKnownState = undefined;

      return ok(true as const);
    } catch (e) {
      return err({
        type: "InvalidSignature",
        id: this.id,
        sessionID,
        newSignature,
        signerID,
        error: e as Error,
      } satisfies TryAddTransactionsError);
    }
  }

  makeNewTransaction(
    sessionID: SessionID,
    signerAgent: ControlledAccountOrAgent,
    changes: JsonValue[],
    privacy:
      | { type: "private"; keyID: KeyID; keySecret: KeySecret }
      | { type: "trusting" },
  ): { signature: Signature; transaction: Transaction } {
    let sessionLog = this.sessions.get(sessionID);
    if (!sessionLog) {
      sessionLog = {
        signerID: signerAgent.currentSignerID(),
        wasm: new WasmSessionLog(
          this.id,
          sessionID,
          signerAgent.currentSignerID(),
        ),
        transactions: [],
        lastSignature: undefined,
        // lastHash: undefined,
        signatureAfter: {},
      };
      this.sessions.set(sessionID, sessionLog);
    }

    const madeAt = Date.now();

    let signatureAndTxJson: string;

    if (privacy.type === "private") {
      signatureAndTxJson = sessionLog.wasm.addNewPrivateTransaction(
        stableStringify(changes),
        signerAgent.currentSignerSecret(),
        privacy.keySecret,
        privacy.keyID,
        madeAt,
      ) as Signature;
    } else {
      signatureAndTxJson = sessionLog.wasm.addNewTrustingTransaction(
        stableStringify(changes),
        signerAgent.currentSignerSecret(),
        madeAt,
      ) as Signature;
    }

    const { signature, transaction } = JSON.parse(signatureAndTxJson);

    sessionLog.lastSignature = signature;
    // sessionLog.lastHash = hash;
    sessionLog.transactions.push(transaction);

    this._cachedNewContentSinceEmpty = undefined;
      this._cachedKnownState = undefined;

    return { signature, transaction };
  }

  testExpectedHashAfter(
    sessionID: SessionID,
    transactions: Transaction[],
  ): { expectedNewHash: Hash } {
    let sessionLog = this.sessions.get(sessionID);
    if (!sessionLog) {
      // TODO: this is ugly
      const ephemeralSessionLog = new WasmSessionLog(
        this.id,
        sessionID,
        "signer_zEPHEMERAL_UNUSED_SIGNER",
      );
      const result = ephemeralSessionLog.testExpectedHashAfter(transactions);
      ephemeralSessionLog.free();
      return { expectedNewHash: result as Hash };
    }
    return {
      expectedNewHash: sessionLog.wasm.testExpectedHashAfter(
        transactions,
      ) as Hash,
    };
  }

  newContentSince(
    knownState: CoValueKnownState | undefined,
  ): NewContentMessage[] | undefined {
    const isKnownStateEmpty = !knownState?.header && !knownState?.sessions;

    if (isKnownStateEmpty && this._cachedNewContentSinceEmpty) {
      return this._cachedNewContentSinceEmpty;
    }

    let currentPiece: NewContentMessage = {
      action: "content",
      id: this.id,
      header: knownState?.header ? undefined : this.header,
      priority: getPriorityFromHeader(this.header),
      new: {},
    };

    const pieces = [currentPiece];

    const sentState: CoValueKnownState["sessions"] = {};

    let pieceSize = 0;

    let sessionsTodoAgain: Set<SessionID> | undefined | "first" = "first";

    while (sessionsTodoAgain === "first" || sessionsTodoAgain?.size || 0 > 0) {
      if (sessionsTodoAgain === "first") {
        sessionsTodoAgain = undefined;
      }
      const sessionsTodo = sessionsTodoAgain ?? this.sessions.keys();

      for (const sessionIDKey of sessionsTodo) {
        const sessionID = sessionIDKey as SessionID;
        const log = this.sessions.get(sessionID)!;
        const knownStateForSessionID = knownState?.sessions[sessionID];
        const sentStateForSessionID = sentState[sessionID];
        const nextKnownSignatureIdx = getNextKnownSignatureIdx(
          log,
          knownStateForSessionID,
          sentStateForSessionID,
        );

        const firstNewTxIdx =
          sentStateForSessionID ?? knownStateForSessionID ?? 0;
        const afterLastNewTxIdx =
          nextKnownSignatureIdx === undefined
            ? log.transactions.length
            : nextKnownSignatureIdx + 1;

        const nNewTx = Math.max(0, afterLastNewTxIdx - firstNewTxIdx);

        if (nNewTx === 0) {
          sessionsTodoAgain?.delete(sessionID);
          continue;
        }

        if (afterLastNewTxIdx < log.transactions.length) {
          if (!sessionsTodoAgain) {
            sessionsTodoAgain = new Set();
          }
          sessionsTodoAgain.add(sessionID);
        }

        const oldPieceSize = pieceSize;
        for (let txIdx = firstNewTxIdx; txIdx < afterLastNewTxIdx; txIdx++) {
          const tx = log.transactions[txIdx]!;
          pieceSize +=
            tx.privacy === "private"
              ? tx.encryptedChanges.length
              : tx.changes.length;
        }

        if (pieceSize >= MAX_RECOMMENDED_TX_SIZE) {
          currentPiece = {
            action: "content",
            id: this.id,
            header: undefined,
            new: {},
            priority: getPriorityFromHeader(this.header),
          };
          pieces.push(currentPiece);
          pieceSize = pieceSize - oldPieceSize;
        }

        let sessionEntry = currentPiece.new[sessionID];
        if (!sessionEntry) {
          sessionEntry = {
            after: sentStateForSessionID ?? knownStateForSessionID ?? 0,
            newTransactions: [],
            lastSignature: "WILL_BE_REPLACED" as Signature,
          };
          currentPiece.new[sessionID] = sessionEntry;
        }

        for (let txIdx = firstNewTxIdx; txIdx < afterLastNewTxIdx; txIdx++) {
          const tx = log.transactions[txIdx]!;
          sessionEntry.newTransactions.push(tx);
        }

        sessionEntry.lastSignature =
          nextKnownSignatureIdx === undefined
            ? log.lastSignature!
            : log.signatureAfter[nextKnownSignatureIdx]!;

        sentState[sessionID] =
          (sentStateForSessionID ?? knownStateForSessionID ?? 0) + nNewTx;
      }
    }

    const piecesWithContent = pieces.filter(
      (piece) => Object.keys(piece.new).length > 0 || piece.header,
    );

    if (piecesWithContent.length === 0) {
      return undefined;
    }

    if (isKnownStateEmpty) {
      this._cachedNewContentSinceEmpty = piecesWithContent;
    }

    return piecesWithContent;
  }

  knownState(): CoValueKnownState {
    if (this._cachedKnownState) {
      return this._cachedKnownState;
    } else {
      const knownState = this.knownStateUncached();
      this._cachedKnownState = knownState;
      return knownState;
    }
  }

  /** @internal */
  knownStateUncached(): CoValueKnownState {
    const sessions: CoValueKnownState["sessions"] = {};

    for (const [sessionID, sessionLog] of this.sessions.entries()) {
      sessions[sessionID] = sessionLog.transactions.length;
    }

    return {
      id: this.id,
      header: true,
      sessions,
    };
  }
}

function getNextKnownSignatureIdx(
  log: SessionLog,
  knownStateForSessionID?: number,
  sentStateForSessionID?: number,
) {
  return Object.keys(log.signatureAfter)
    .map(Number)
    .sort((a, b) => a - b)
    .find(
      (idx) => idx >= (sentStateForSessionID ?? knownStateForSessionID ?? -1),
    );
}
