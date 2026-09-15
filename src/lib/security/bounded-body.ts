export async function boundedText(
  message: Request | Response,
  limit: number,
): Promise<string> {
  if (Number(message.headers.get("content-length")) > limit || !message.body)
    throw new Error("body_limit");
  const reader = message.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > limit) throw new Error("body_limit");
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    await reader.cancel();
  }
}
