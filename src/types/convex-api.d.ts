/* eslint-disable */
import type * as folders from "../../convex/folders";
import type * as notes from "../../convex/notes";
import type * as otp from "../../convex/otp";
import type * as seed from "../../convex/seed";
import type * as users from "../../convex/users";
import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";

type FullApi = ApiFromModules<{
  folders: typeof folders;
  notes: typeof notes;
  otp: typeof otp;
  seed: typeof seed;
  users: typeof users;
}>;

declare module "*/convex/_generated/api" {
  export const api: FilterApi<FullApi, FunctionReference<any, "public">>;
  export const internal: FilterApi<FullApi, FunctionReference<any, "internal">>;
  export const components: {};
}

declare module "../../convex/_generated/api" {
  export const api: FilterApi<FullApi, FunctionReference<any, "public">>;
  export const internal: FilterApi<FullApi, FunctionReference<any, "internal">>;
  export const components: {};
}

