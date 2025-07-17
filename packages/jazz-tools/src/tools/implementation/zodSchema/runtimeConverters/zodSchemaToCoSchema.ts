import { RawCoList, RawCoMap } from "cojson";
import {
  Account,
  CoFeed,
  CoList,
  CoMap,
  CoPlainText,
  CoRichText,
  CoValueClass,
  FileStream,
  SchemaUnion,
  enrichAccountSchema,
  enrichCoDiscriminatedUnionSchema,
  enrichCoFeedSchema,
  enrichCoListSchema,
  enrichCoMapSchema,
  enrichFileStreamSchema,
  enrichPlainTextSchema,
  isCoValueClass,
} from "../../../internal.js";
import { coField } from "../../schema.js";

import { enrichRichTextSchema } from "../schemaTypes/RichTextSchema.js";
import { schemaUnionDiscriminatorFor } from "../unionUtils.js";
import {
  AnyCoreCoValueSchema,
  AnyZodOrCoValueSchema,
  CoValueClassFromAnySchema,
  CoValueClassOrSchema,
  CoValueSchemaFromCoreSchema,
} from "../zodSchema.js";
import {
  SchemaField,
  schemaFieldToCoFieldDef,
} from "./zodFieldToCoFieldDef.js";

export function isAnyCoValueSchema(
  schema: AnyZodOrCoValueSchema | CoValueClass,
): schema is AnyCoreCoValueSchema {
  return (
    "getZodSchema" in schema &&
    "collaborative" in schema &&
    schema.collaborative === true
  );
}

export function isCoValueSchema(
  schema: AnyZodOrCoValueSchema | CoValueClass,
): schema is CoValueSchemaFromCoreSchema<AnyCoreCoValueSchema> {
  return isAnyCoValueSchema(schema) && "getCoValueClass" in schema;
}

/**
 * Convert a Zod schema into a CoValue schema.
 *
 * @param schema A Zod schema that may represent a CoValue schema
 * @returns The CoValue schema matching the provided ProtoCoSchema, or `null` if the Zod schema
 * does not match a CoValue schema.
 */
export function coreSchemaToCoSchema<S extends AnyCoreCoValueSchema>(
  schema: S,
): CoValueSchemaFromCoreSchema<S> {
  if (schema.builtin === "CoOptional") {
    throw new Error(
      `co.optional() of collaborative types is not supported as top-level schemas: ${JSON.stringify(schema)}`,
    );
  } else if (schema.builtin === "CoMap" || schema.builtin === "Account") {
    const def = schema.getDefinition();
    const ClassToExtend = schema.builtin === "Account" ? Account : CoMap;

    const coValueClass = class ZCoMap extends ClassToExtend {
      constructor(options: { fromRaw: RawCoMap } | undefined) {
        super(options);
        for (const [fieldName, fieldType] of Object.entries(def.shape)) {
          (this as any)[fieldName] = schemaFieldToCoFieldDef(
            fieldType as SchemaField,
          );
        }
        if (def.catchall) {
          (this as any)[coField.items] = schemaFieldToCoFieldDef(
            def.catchall as SchemaField,
          );
        }
      }
    };

    const coValueSchema =
      ClassToExtend === Account
        ? enrichAccountSchema(schema as any, coValueClass as any)
        : enrichCoMapSchema(schema as any, coValueClass as any);

    return coValueSchema as unknown as CoValueSchemaFromCoreSchema<S>;
  } else if (schema.builtin === "CoList") {
    const def = schema.getDefinition();
    const coValueClass = class ZCoList extends CoList {
      constructor(options: { fromRaw: RawCoList } | undefined) {
        super(options);
        (this as any)[coField.items] = schemaFieldToCoFieldDef(
          def.element as SchemaField,
        );
      }
    };

    const coValueSchema = enrichCoListSchema(schema, coValueClass as any);

    return coValueSchema as unknown as CoValueSchemaFromCoreSchema<S>;
  } else if (schema.builtin === "CoFeed") {
    const coValueClass = CoFeed.Of(
      schemaFieldToCoFieldDef(schema.element as SchemaField),
    );
    const coValueSchema = enrichCoFeedSchema(schema, coValueClass as any);
    return coValueSchema as unknown as CoValueSchemaFromCoreSchema<S>;
  } else if (schema.builtin === "FileStream") {
    const coValueClass = FileStream;
    const coValueSchema = enrichFileStreamSchema(schema, coValueClass);
    return coValueSchema as unknown as CoValueSchemaFromCoreSchema<S>;
  } else if (schema.builtin === "CoPlainText") {
    const coValueClass = CoPlainText;
    const coValueSchema = enrichPlainTextSchema(schema, coValueClass);
    return coValueSchema as unknown as CoValueSchemaFromCoreSchema<S>;
  } else if (schema.builtin === "CoRichText") {
    const coValueClass = CoRichText;
    const coValueSchema = enrichRichTextSchema(schema, coValueClass);
    return coValueSchema as unknown as CoValueSchemaFromCoreSchema<S>;
  } else if (schema.builtin === "CoDiscriminatedUnion") {
    const coValueClass = SchemaUnion.Of(schemaUnionDiscriminatorFor(schema));
    const coValueSchema = enrichCoDiscriminatedUnionSchema(
      schema as any,
      coValueClass as any,
    );
    return coValueSchema as unknown as CoValueSchemaFromCoreSchema<S>;
  } else {
    const notReachable: never = schema;
    throw new Error(
      `Unsupported zod CoValue type for top-level schema: ${JSON.stringify(notReachable, undefined, 2)}`,
    );
  }
}

// TODO rename to coValueClassFromCoValueClassOrSchema
export function anySchemaToCoSchema<S extends CoValueClassOrSchema>(
  schema: S,
): CoValueClassFromAnySchema<S> {
  if (isCoValueClass(schema)) {
    return schema as any;
  } else if (isCoValueSchema(schema)) {
    return schema.getCoValueClass() as any;
  }

  throw new Error(`Unsupported schema: ${JSON.stringify(schema)}`);
}
