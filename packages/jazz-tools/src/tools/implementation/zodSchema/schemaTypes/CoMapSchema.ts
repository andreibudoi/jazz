import { CoValueUniqueness } from "cojson";
import {
  Account,
  CoMap,
  Group,
  RefsToResolve,
  RefsToResolveStrict,
  Resolved,
  Simplify,
  SubscribeListenerOptions,
  coOptionalDefiner,
  coreSchemaToCoSchema,
} from "../../../internal.js";
import { AnonymousJazzAgent } from "../../anonymousJazzAgent.js";
import { InstanceOrPrimitiveOfSchema } from "../typeConverters/InstanceOrPrimitiveOfSchema.js";
import { InstanceOrPrimitiveOfSchemaCoValuesNullable } from "../typeConverters/InstanceOrPrimitiveOfSchemaCoValuesNullable.js";
import { z } from "../zodReExport.js";
import { AnyZodOrCoValueSchema, WithHelpers } from "../zodSchema.js";
import { CoOptionalSchema } from "./CoOptionalSchema.js";
import { CoreCoValueSchema } from "./CoValueSchema.js";

export interface CoMapSchema<
  Shape extends z.core.$ZodLooseShape,
  Config extends z.core.$ZodObjectConfig = z.core.$ZodObjectConfig,
  Owner extends Account | Group = Account | Group,
> extends AnyCoMapSchema<Shape, Config> {
  create: (
    init: Simplify<CoMapInitZod<Shape>>,
    options?:
      | {
          owner: Owner;
          unique?: CoValueUniqueness["uniqueness"];
        }
      | Owner,
  ) => (Shape extends Record<string, never>
    ? {}
    : {
        -readonly [key in keyof Shape]: InstanceOrPrimitiveOfSchema<Shape[key]>;
      }) &
    (unknown extends Config["out"][string]
      ? {}
      : {
          [key: string]: Config["out"][string];
        }) &
    CoMap;

  load<
    const R extends RefsToResolve<
      Simplify<CoMapInstanceCoValuesNullable<Shape>> & CoMap
    > = true,
  >(
    id: string,
    options?: {
      resolve?: RefsToResolveStrict<
        Simplify<CoMapInstanceCoValuesNullable<Shape>> & CoMap,
        R
      >;
      loadAs?: Account | AnonymousJazzAgent;
      skipRetry?: boolean;
    },
  ): Promise<Resolved<
    Simplify<CoMapInstanceCoValuesNullable<Shape>> & CoMap,
    R
  > | null>;

  subscribe<
    const R extends RefsToResolve<
      Simplify<CoMapInstanceCoValuesNullable<Shape>> & CoMap
    > = true,
  >(
    id: string,
    options: SubscribeListenerOptions<
      Simplify<CoMapInstanceCoValuesNullable<Shape>> & CoMap,
      R
    >,
    listener: (
      value: Resolved<
        Simplify<CoMapInstanceCoValuesNullable<Shape>> & CoMap,
        R
      >,
      unsubscribe: () => void,
    ) => void,
  ): () => void;

  /** @deprecated Use `CoMap.upsertUnique` and `CoMap.loadUnique` instead. */
  findUnique(
    unique: CoValueUniqueness["uniqueness"],
    ownerID: string,
    as?: Account | Group | AnonymousJazzAgent,
  ): string;

  upsertUnique: <
    const R extends RefsToResolve<
      Simplify<CoMapInstanceCoValuesNullable<Shape>> & CoMap
    > = true,
  >(options: {
    value: Simplify<CoMapInitZod<Shape>>;
    unique: CoValueUniqueness["uniqueness"];
    owner: Owner;
    resolve?: RefsToResolveStrict<
      Simplify<CoMapInstanceCoValuesNullable<Shape>> & CoMap,
      R
    >;
  }) => Promise<Resolved<
    Simplify<CoMapInstanceCoValuesNullable<Shape>> & CoMap,
    R
  > | null>;

  loadUnique<
    const R extends RefsToResolve<
      Simplify<CoMapInstanceCoValuesNullable<Shape>> & CoMap
    > = true,
  >(
    unique: CoValueUniqueness["uniqueness"],
    ownerID: string,
    options?: {
      resolve?: RefsToResolveStrict<
        Simplify<CoMapInstanceCoValuesNullable<Shape>> & CoMap,
        R
      >;
      loadAs?: Account | AnonymousJazzAgent;
    },
  ): Promise<Resolved<
    Simplify<CoMapInstanceCoValuesNullable<Shape>> & CoMap,
    R
  > | null>;

  catchall<T extends AnyZodOrCoValueSchema>(
    schema: T,
  ): CoMapSchema<Shape, z.core.$catchall<T>>;

  /** @deprecated Define your helper methods separately, in standalone functions. */
  withHelpers<S extends AnyCoMapSchema, T extends object>(
    this: S,
    helpers: (Self: S) => T,
  ): WithHelpers<S, T>;

  withMigration(
    migration: (
      value: Resolved<
        Simplify<CoMapInstanceCoValuesNullable<Shape>> & CoMap,
        true
      >,
    ) => undefined,
  ): CoMapSchema<Shape, Config, Owner>;

  getCoValueClass: () => typeof CoMap;

  optional(): CoOptionalSchema<CoMapSchema<Shape, Config, Owner>>;
}

export function createCoreCoMapSchema<Shape extends z.core.$ZodLooseShape>(
  input: { shape: Shape } | { zodObject: z.ZodObject<Shape> },
): AnyCoMapSchema<Shape> {
  const zodSchema =
    "zodObject" in input
      ? input.zodObject
      : z.object(input.shape).meta({
          collaborative: true,
        });
  return Object.assign(zodSchema, {
    collaborative: true as const,
    builtin: "CoMap" as const,
    getDefinition: () => ({
      get shape() {
        return zodSchema.def.shape;
      },
      get catchall() {
        return zodSchema.def.catchall;
      },
    }),
    getZodSchema: () => zodSchema,
  });
}

export function enrichCoMapSchema<
  Shape extends z.core.$ZodLooseShape,
  Config extends z.core.$ZodObjectConfig,
>(
  schema: AnyCoMapSchema<Shape, Config>,
  coValueClass: typeof CoMap,
): CoMapSchema<Shape, Config> {
  // @ts-expect-error schema is actually a z.ZodObject, but we need to use z.core.$ZodObject to avoid circularity issues
  const baseCatchall = schema.catchall;
  const coValueSchema = Object.assign(schema, {
    create: (...args: [any, ...any[]]) => {
      return coValueClass.create(...args);
    },
    load: (...args: [any, ...any[]]) => {
      return coValueClass.load(...args);
    },
    subscribe: (...args: [any, ...any[]]) => {
      // @ts-expect-error
      return coValueClass.subscribe(...args);
    },
    findUnique: (...args: [any, ...any[]]) => {
      // @ts-expect-error
      return coValueClass.findUnique(...args);
    },
    upsertUnique: (...args: [any, ...any[]]) => {
      // @ts-expect-error
      return coValueClass.upsertUnique(...args);
    },
    loadUnique: (...args: [any, ...any[]]) => {
      // @ts-expect-error
      return coValueClass.loadUnique(...args);
    },
    catchall: (index: AnyZodOrCoValueSchema) => {
      const newSchema = baseCatchall(index);
      const enrichedSchema = createCoreCoMapSchema({ zodObject: newSchema });
      return coreSchemaToCoSchema(enrichedSchema);
    },
    withHelpers: (helpers: (Self: AnyCoMapSchema<Shape, Config>) => object) => {
      return Object.assign(schema, helpers(schema));
    },
    withMigration: (migration: (value: any) => undefined) => {
      // @ts-expect-error TODO check
      coValueClass.prototype.migrate = migration;

      return coValueSchema;
    },
    getCoValueClass: () => {
      return coValueClass;
    },

    optional: () => {
      return coOptionalDefiner(coValueSchema);
    },
  }) as unknown as CoMapSchema<Shape, Config>;
  return coValueSchema;
}

export type optionalKeys<Shape extends z.core.$ZodLooseShape> = {
  [key in keyof Shape]: Shape[key] extends z.core.$ZodOptional<any>
    ? key
    : never;
}[keyof Shape];

export type requiredKeys<Shape extends z.core.$ZodLooseShape> = {
  [key in keyof Shape]: Shape[key] extends z.core.$ZodOptional<any>
    ? never
    : key;
}[keyof Shape];

export type CoMapInitZod<Shape extends z.core.$ZodLooseShape> = {
  [key in optionalKeys<Shape>]?: NonNullable<
    InstanceOrPrimitiveOfSchemaCoValuesNullable<Shape[key]>
  >;
} & {
  [key in requiredKeys<Shape>]: NonNullable<
    InstanceOrPrimitiveOfSchemaCoValuesNullable<Shape[key]>
  >;
} & { [key in keyof Shape]?: unknown };

export type CoMapSchemaDefinition = {
  shape: z.core.$ZodShape;
  catchall?: AnyZodOrCoValueSchema;
};

// less precise version to avoid circularity issues and allow matching against
export type AnyCoMapSchema<
  Shape extends z.core.$ZodLooseShape = z.core.$ZodLooseShape,
  Config extends z.core.$ZodObjectConfig = z.core.$ZodObjectConfig,
> = CoreCoValueSchema &
  z.core.$ZodObject<Shape, Config> &
  z.core.$ZodTypeDiscriminable & {
    builtin: "CoMap";
    getDefinition: () => CoMapSchemaDefinition;
    getZodSchema: () => z.core.$ZodObject<Shape, Config>;
  };

export type CoMapInstance<Shape extends z.core.$ZodLooseShape> = {
  -readonly [key in keyof Shape]: InstanceOrPrimitiveOfSchema<Shape[key]>;
} & CoMap;

export type CoMapInstanceCoValuesNullable<Shape extends z.core.$ZodLooseShape> =
  {
    -readonly [key in keyof Shape]: InstanceOrPrimitiveOfSchemaCoValuesNullable<
      Shape[key]
    >;
  };
