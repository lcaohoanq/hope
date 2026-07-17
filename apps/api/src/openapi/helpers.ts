import { resolver } from "hono-openapi";
import type { OpenAPIV3_1 } from "openapi-types";
import type { z } from "zod";
import { errorResponseSchema, privateProfileErrorSchema } from "./schemas";

/** JSON response entry for `describeRoute` using a Zod schema. */
export function jsonResponse(schema: z.ZodType, description: string) {
  return {
    description,
    content: {
      "application/json": {
        schema: resolver(schema),
      },
    },
  };
}

/** JSON request body for `describeRoute` (casts resolver for OpenAPI types). */
export function jsonRequestBody(schema: z.ZodType, required = true) {
  return {
    required,
    content: {
      "application/json": {
        // hono-openapi accepts resolver() at runtime; OperationObject types are narrower.
        schema: resolver(schema) as unknown as OpenAPIV3_1.SchemaObject,
      },
    },
  };
}

/** Alias used by some route modules. */
export const jsonContent = jsonResponse;

/** Common authenticated-route error responses. */
export const authErrorResponses = {
  400: jsonResponse(errorResponseSchema, "Validation or bad request"),
  401: jsonResponse(errorResponseSchema, "Authentication required"),
  403: jsonResponse(errorResponseSchema, "Forbidden (onboarding or access)"),
  404: jsonResponse(errorResponseSchema, "Not found"),
  409: jsonResponse(errorResponseSchema, "Conflict"),
  500: jsonResponse(errorResponseSchema, "Server error"),
} as const;

/** Alias used by some route modules. */
export const errorResponses = authErrorResponses;

export const privateProfile403 = jsonResponse(privateProfileErrorSchema, "Profile is private");

/** Clerk JWT bearer security requirement. */
export const bearerSecurity: OpenAPIV3_1.SecurityRequirementObject[] = [{ bearerAuth: [] }];

/** Explicitly public (no bearer required). */
export const publicSecurity: OpenAPIV3_1.SecurityRequirementObject[] = [];
