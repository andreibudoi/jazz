import { z } from "../zodReExport.js";
import { CoValueSchemaFromCoreSchema } from "../zodSchema.js";
import { CoreCoValueSchema } from "./CoValueSchema.js";

type CoOptionalSchemaDefinition<
  Shape extends CoreCoValueSchema = CoreCoValueSchema,
> = {
  innerType: Shape;
};

export interface CoreCoOptionalSchema<
  Shape extends CoreCoValueSchema = CoreCoValueSchema,
> extends CoreCoValueSchema {
  builtin: "CoOptional";
  innerType: Shape;
  getDefinition: () => CoOptionalSchemaDefinition<Shape>;
}

export interface CoOptionalSchema<
  Shape extends CoreCoValueSchema = CoreCoValueSchema,
> extends CoreCoOptionalSchema<Shape> {
  getCoValueClass: () => ReturnType<
    CoValueSchemaFromCoreSchema<Shape>["getCoValueClass"]
  >;
}

export function createCoOptionalSchema<T extends CoreCoValueSchema>(
  schema: T,
): CoOptionalSchema<T> {
  const zodSchema = z.optional(schema as any);
  return Object.assign(zodSchema, {
    collaborative: true as const,
    builtin: "CoOptional" as const,
    innerType: schema,
    getDefinition: () => ({
      innerType: schema,
    }),
    getCoValueClass: () => {
      return (schema as any).getCoValueClass();
    },
  });
}
