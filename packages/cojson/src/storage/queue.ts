import { LinkedList } from "../PriorityBasedMessageQueue.js";
import { CoValueKnownState, NewContentMessage } from "../sync.js";

type StoreQueueEntry = {
  data: NewContentMessage[];
  correctionCallback: (data: CoValueKnownState) => void;
};

export class StoreQueue {
  private queue = new LinkedList<StoreQueueEntry>();

  public push(
    data: NewContentMessage[],
    correctionCallback: (data: CoValueKnownState) => void,
  ) {
    this.queue.push({ data, correctionCallback });
  }

  public pull() {
    return this.queue.shift();
  }

  processing = false;

  async processQueue(
    callback: (
      data: NewContentMessage[],
      correctionCallback: (data: CoValueKnownState) => void,
    ) => Promise<void>,
  ) {
    if (this.processing) {
      return;
    }

    this.processing = true;

    let entry: StoreQueueEntry | undefined;

    while ((entry = this.pull())) {
      const { data, correctionCallback } = entry;

      await callback(data, correctionCallback);
    }

    this.processing = false;
  }

  drain() {
    while (this.pull()) {}
  }
}
