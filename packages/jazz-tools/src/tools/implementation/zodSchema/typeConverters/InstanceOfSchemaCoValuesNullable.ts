import {
  Account,
  AnyZodOrCoValueSchema,
  CoFeed,
  CoList,
  CoMap,
  CoPlainText,
  CoRichText,
  CoValueClass,
  CoreAccountSchema,
  CoreCoDiscriminatedUnionSchema,
  CoreCoFeedSchema,
  CoreCoListSchema,
  CoreCoMapSchema,
  CoreCoRecordSchema,
  FileStream,
} from "../../../internal.js";
import { CoreCoOptionalSchema } from "../schemaTypes/CoOptionalSchema.js";
import { CoreCoValueSchema } from "../schemaTypes/CoValueSchema.js";
import { CoreFileStreamSchema } from "../schemaTypes/FileStreamSchema.js";
import { CorePlainTextSchema } from "../schemaTypes/PlainTextSchema.js";
import { CoreRichTextSchema } from "../schemaTypes/RichTextSchema.js";
import { z } from "../zodReExport.js";
import { InstanceOrPrimitiveOfSchemaCoValuesNullable } from "./InstanceOrPrimitiveOfSchemaCoValuesNullable.js";

export type InstanceOfSchemaCoValuesNullable<
  S extends CoValueClass | AnyZodOrCoValueSchema,
> = S extends CoreCoValueSchema
  ? S extends CoreAccountSchema<infer Shape>
    ?
        | ({
            [key in keyof Shape]: InstanceOrPrimitiveOfSchemaCoValuesNullable<
              Shape[key]
            >;
          } & Account)
        | null
    : S extends CoreCoRecordSchema<infer K, infer V>
      ?
          | ({
              [key in z.output<K> &
                string]: InstanceOrPrimitiveOfSchemaCoValuesNullable<V>;
            } & CoMap)
          | null
      : S extends CoreCoMapSchema<infer Shape, infer Config>
        ?
            | ({
                [key in keyof Shape]: InstanceOrPrimitiveOfSchemaCoValuesNullable<
                  Shape[key]
                >;
              } & (unknown extends Config["out"][string]
                ? {}
                : {
                    [key: string]: Config["out"][string];
                  }) &
                CoMap)
            | null
        : S extends CoreCoListSchema<infer T>
          ? CoList<InstanceOrPrimitiveOfSchemaCoValuesNullable<T>> | null
          : S extends CoreCoFeedSchema<infer T>
            ? CoFeed<InstanceOrPrimitiveOfSchemaCoValuesNullable<T>> | null
            : S extends CorePlainTextSchema
              ? CoPlainText | null
              : S extends CoreRichTextSchema
                ? CoRichText | null
                : S extends CoreFileStreamSchema
                  ? FileStream | null
                  : S extends CoreCoOptionalSchema<infer Inner>
                    ?
                        | InstanceOrPrimitiveOfSchemaCoValuesNullable<Inner>
                        | undefined
                    : S extends CoreCoDiscriminatedUnionSchema<infer Members>
                      ? InstanceOrPrimitiveOfSchemaCoValuesNullable<
                          Members[number]
                        >
                      : never
  : S extends CoValueClass
    ? InstanceType<S> | null
    : never;
