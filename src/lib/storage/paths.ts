const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertUuid(value: string, label: string) {
  if (!uuidPattern.test(value)) throw new Error(`${label} must be a UUID`);
}

function safeExtension(filename: string): string {
  const match = filename.toLowerCase().match(/\.([a-z0-9]{1,8})$/);
  return match?.[1] ?? "bin";
}

export function privateObjectPath(
  ownerId: string,
  objectId: string,
  originalFilename: string,
): string {
  assertUuid(ownerId, "Owner ID");
  assertUuid(objectId, "Object ID");
  return `users/${ownerId}/${objectId}.${safeExtension(originalFilename)}`;
}

export function isOwnedPrivatePath(ownerId: string, path: string): boolean {
  if (!uuidPattern.test(ownerId) || path.includes("\\")) return false;
  const segments = path.split("/");
  return (
    segments.length === 3 &&
    segments[0] === "users" &&
    segments[1] === ownerId &&
    Boolean(segments[2]) &&
    segments[2] !== "." &&
    segments[2] !== ".."
  );
}
