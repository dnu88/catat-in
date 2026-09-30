import {
  getVoiceAuthSession,
  processVoiceTransaction,
  uploadVoiceAudio,
} from "../src/services/voice-intake";

describe("voice intake service", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("requests a preview extraction without creating a transaction", async () => {
    const extraction = {
      status: "done" as const,
      transcript: "beli kopi tiga puluh lima ribu",
      confidence: 0.92,
      review_required: false,
      fields: {
        nominal: 35000,
        type: "expense" as const,
        kategori: "Makan & Minum",
        merchant: null,
        tanggal: "2026-09-30",
        catatan: "Beli kopi",
      },
    };
    const invoke = jest.fn().mockResolvedValue({ data: extraction, error: null });
    const supabase = { functions: { invoke } } as any;

    await expect(processVoiceTransaction(supabase, "user-1/audio.m4a")).resolves.toEqual(extraction);
    expect(invoke).toHaveBeenCalledWith("process-voice", {
      body: { audio_path: "user-1/audio.m4a" },
    });
  });

  it("returns the current auth session", async () => {
    const session = { access_token: "token", user: { id: "user-1" } };
    const supabase = {
      auth: { getSession: jest.fn().mockResolvedValue({ data: { session }, error: null }) },
    } as any;

    await expect(getVoiceAuthSession(supabase)).resolves.toBe(session);
  });

  it("rejects recordings larger than five megabytes before upload", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue({
      blob: async () => ({ size: 5 * 1024 * 1024 + 1, type: "audio/m4a" }),
    } as Response);
    const upload = jest.fn();
    const supabase = {
      storage: { from: jest.fn(() => ({ upload })) },
    } as any;

    await expect(uploadVoiceAudio(supabase, "user-1", {
      uri: "file:///recording.m4a",
      mimeType: "audio/m4a",
    })).rejects.toThrow("maksimal 5 MB");
    expect(upload).not.toHaveBeenCalled();
  });
});
