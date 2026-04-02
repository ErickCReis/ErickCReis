import { nanoid } from "nanoid";

export function createPrefixedNanoId(prefix: string) {
  return `${prefix}_${nanoid()}`;
}

export function createContentId() {
  return createPrefixedNanoId("ct");
}

export function createLiveId() {
  return createPrefixedNanoId("lv");
}
