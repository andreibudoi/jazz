import { JsonValue } from "cojson";
import {
  Account,
  CoDiscriminatedUnionSchema,
  CoFeed,
  CoList,
  CoPlainText,
  CoRichText,
  CoValueClass,
  CoreAccountSchema,
  CoreCoFeedSchema,
  CoreCoListSchema,
  CoreCoMapSchema,
  CoreCoRecordSchema,
  CoreFileStreamSchema,
  CorePlainTextSchema,
  FileStream,
  InstanceOrPrimitiveOfSchema,
  NotNull,
  Profile,
} from "../../../internal.js";
import { CoreCoOptionalSchema } from "../schemaTypes/CoOptionalSchema.js";
import { CoreCoValueSchema } from "../schemaTypes/CoValueSchema.js";
import { CoreRichTextSchema } from "../schemaTypes/RichTextSchema.js";
import { z } from "../zodReExport.js";
import { AnyZodOrCoValueSchema } from "../zodSchema.js";

/**
 * Returns the type of the value that should be used to initialize a coField
 * of the given schema.
 */
export type CoFieldInit<T extends AnyZodOrCoValueSchema> =
  T extends z.core.$ZodNullable
    ? InstanceOrPrimitiveOfSchemaInit<T>
    : NotNull<InstanceOrPrimitiveOfSchemaInit<T>>;

// Makes all of the value's fields nullable by default, to support using
// partially-loaded CoValues to initialize new CoValues.
type InstanceOrPrimitiveOfSchemaInit<
  S extends CoValueClass | AnyZodOrCoValueSchema,
> = S extends CoreCoValueSchema
  ? S extends CoreAccountSchema<infer Shape>
    ?
        | ({
            -readonly [key in keyof Shape]: InstanceOrPrimitiveOfSchemaInit<
              Shape[key]
            >;
          } & { profile: Profile | null } & Account)
        | null
    : S extends CoreCoRecordSchema<infer K, infer V>
      ?
          | {
              -readonly [key in z.output<K> &
                string]: InstanceOrPrimitiveOfSchemaInit<V>;
            }
          | null
      : S extends CoreCoMapSchema<infer Shape, infer CatchAll>
        ?
            | ({
                -readonly [key in keyof Shape]: InstanceOrPrimitiveOfSchemaInit<
                  Shape[key]
                >;
              } & (CatchAll extends AnyZodOrCoValueSchema
                ? {
                    [key: string]: InstanceOrPrimitiveOfSchemaInit<CatchAll>;
                  }
                : {}))
            | null
        : // TODO for now we're only allowing JSON inputs for creating CoMaps
          // TODO continue with the rest of the CoValue types
          S extends CoreCoListSchema<infer T>
          ? CoList<InstanceOrPrimitiveOfSchemaInit<T>> | null
          : S extends CoreCoFeedSchema<infer T>
            ? CoFeed<InstanceOrPrimitiveOfSchemaInit<T>> | null
            : S extends CorePlainTextSchema
              ? CoPlainText | null
              : S extends CoreRichTextSchema
                ? CoRichText | null
                : S extends CoreFileStreamSchema
                  ? FileStream | null
                  : S extends CoreCoOptionalSchema<infer T>
                    ? InstanceOrPrimitiveOfSchemaInit<T> | undefined
                    : S extends CoDiscriminatedUnionSchema<infer Members>
                      ? InstanceOrPrimitiveOfSchemaInit<Members[number]>
                      : never
  : S extends z.core.$ZodType
    ? S extends z.core.$ZodOptional<infer Inner extends z.core.$ZodType>
      ? InstanceOrPrimitiveOfSchemaInit<Inner> | undefined
      : S extends z.core.$ZodNullable<infer Inner extends z.core.$ZodType>
        ? InstanceOrPrimitiveOfSchemaInit<Inner> | null
        : S extends z.ZodJSONSchema
          ? JsonValue
          : S extends z.core.$ZodUnion<
                infer Members extends readonly z.core.$ZodType[]
              >
            ? InstanceOrPrimitiveOfSchemaInit<Members[number]>
            : // primitives below here - we manually traverse to ensure we only allow what we can handle
              S extends z.core.$ZodObject<infer Shape>
              ? {
                  -readonly [key in keyof Shape]: InstanceOrPrimitiveOfSchema<
                    Shape[key]
                  >;
                }
              : S extends z.core.$ZodArray<infer Item extends z.core.$ZodType>
                ? InstanceOrPrimitiveOfSchema<Item>[]
                : S extends z.core.$ZodTuple<
                      infer Items extends z.core.$ZodType[]
                    >
                  ? {
                      [key in keyof Items]: InstanceOrPrimitiveOfSchema<
                        Items[key]
                      >;
                    }
                  : S extends z.core.$ZodString
                    ? string
                    : S extends z.core.$ZodNumber
                      ? number
                      : S extends z.core.$ZodBoolean
                        ? boolean
                        : S extends z.core.$ZodLiteral<infer Literal>
                          ? Literal
                          : S extends z.core.$ZodDate
                            ? Date
                            : S extends z.core.$ZodEnum<infer Enum>
                              ? Enum[keyof Enum]
                              : S extends z.core.$ZodTemplateLiteral<
                                    infer pattern
                                  >
                                ? pattern
                                : S extends z.core.$ZodReadonly<
                                      infer Inner extends z.core.$ZodType
                                    >
                                  ? InstanceOrPrimitiveOfSchema<Inner>
                                  : S extends z.core.$ZodDefault<
                                        infer Default extends z.core.$ZodType
                                      >
                                    ? InstanceOrPrimitiveOfSchema<Default>
                                    : S extends z.core.$ZodCatch<
                                          infer Catch extends z.core.$ZodType
                                        >
                                      ? InstanceOrPrimitiveOfSchema<Catch>
                                      : never
    : S extends CoValueClass
      ? InstanceType<S> | null
      : never;
