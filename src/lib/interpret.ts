export type Interpreted = {
  title: string;
  payload: string;
  risk: "financial" | "external_write" | "read";
  why: string;
  mix: string;
};

const EXAMPLES: Record<string, Interpreted> = {
  "send ksh 5000 to mama wanjiku kesho by 5pm": {
    title: "Send Ksh 5,000 to Mama Wanjiku",
    payload: "MPESA · Ksh 5,000 · Mama Wanjiku · tomorrow 17:00",
    risk: "financial",
    why: "External money movement. PAL will not send until you confirm.",
    mix: "English–Swahili",
  },
  "remind ngozi to pay eighty five thousand naira by tomorrow": {
    title: "Remind Ngozi about ₦85,000",
    payload: "WhatsApp reminder · Ngozi · ₦85,000 · due tomorrow",
    risk: "external_write",
    why: "Customer message is an external write.",
    mix: "English–Nigerian",
  },
  "show me chinedu last invoice": {
    title: "Lookup last invoice for Chinedu",
    payload: "Read · invoices · contact: Chinedu",
    risk: "read",
    why: "Read-only. This demo still asks.",
    mix: "English",
  },
};

export function interpret(utterance: string): Interpreted {
  const key = utterance.trim().toLowerCase().replace(/\s+/g, " ");
  if (EXAMPLES[key]) return EXAMPLES[key];

  const amount =
    utterance.match(/(Ksh|KES|₦|NGN)\s*[\d,]+/i)?.[0] ?? "unspecified amount";
  const send = /send|pay|transfer/i.test(utterance);
  const remind = /remind/i.test(utterance);
  const mix = /kesho|sasa|naira|ksh/i.test(utterance)
    ? "Code-switch detected"
    : "English";

  if (send) {
    return {
      title: `Send ${amount}`,
      payload: `External write · ${amount} · ${utterance.slice(0, 80)}`,
      risk: "financial",
      why: "Looks like money movement. PAL is asking before it acts.",
      mix,
    };
  }
  if (remind) {
    return {
      title: "Send a reminder",
      payload: `Message · ${utterance.slice(0, 80)}`,
      risk: "external_write",
      why: "Outbound message. PAL is asking before it acts.",
      mix,
    };
  }
  return {
    title: "Proposed action",
    payload: utterance.slice(0, 120) || "No utterance",
    risk: "external_write",
    why: "Insufficient certainty for auto-run. PAL is asking.",
    mix,
  };
}
