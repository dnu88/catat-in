import type { SupabaseClient } from "@supabase/supabase-js";

export type VoiceAudioAsset = {
	uri: string;
	fileName?: string | null;
	mimeType?: string | null;
};

export type VoiceExtraction = {
	status: "done" | "error";
	transcript: string;
	confidence: number;
	review_required: boolean;
	fields: {
		nominal: number | null;
		type: "income" | "expense" | null;
		kategori: string | null;
		merchant: string | null;
		tanggal: string | null;
		catatan: string | null;
	};
	error_message?: string;
};

const MAX_VOICE_BYTES = 5 * 1024 * 1024;
const ALLOWED_VOICE_MIME_TYPES = new Set([
	"audio/m4a",
	"audio/mp4",
	"audio/mpeg",
	"audio/wav",
	"audio/webm",
	"audio/ogg",
	"audio/x-m4a",
]);

export async function getVoiceAuthSession(supabase: SupabaseClient) {
	const { data, error } = await supabase.auth.getSession();
	if (error) throw error;
	return data.session;
}

function resolveVoiceMimeType(asset: VoiceAudioAsset) {
	return asset.mimeType ?? "audio/m4a";
}

function resolveVoiceFileName(asset: VoiceAudioAsset) {
	return asset.fileName ?? `voice-${Date.now()}.m4a`;
}

export async function uploadVoiceAudio(
	supabase: SupabaseClient,
	userId: string,
	asset: VoiceAudioAsset,
) {
	const response = await fetch(asset.uri);
	const blob = await response.blob();
	const mimeType = resolveVoiceMimeType(asset);
	if (blob.size > MAX_VOICE_BYTES) {
		throw new Error("Rekaman maksimal 5 MB.");
	}
	if (!ALLOWED_VOICE_MIME_TYPES.has(mimeType)) {
		throw new Error("Format rekaman belum didukung.");
	}
	const safeName = resolveVoiceFileName(asset).replace(/[^a-zA-Z0-9._-]/g, "-");
	const path = `${userId}/${Date.now()}-${safeName}`;

	const { error } = await supabase.storage
		.from("voice-inputs")
		.upload(path, blob, {
			contentType: mimeType,
			upsert: false,
		});

	if (error) throw error;
	return path;
}

export async function processVoiceTransaction(
	supabase: SupabaseClient,
	audioPath: string,
): Promise<VoiceExtraction> {
	const { data, error } = await supabase.functions.invoke<VoiceExtraction>(
		"process-voice",
		{
			body: {
				audio_path: audioPath,
			},
		},
	);

	if (error) throw error;
	if (!data) throw new Error("Voice processing returned no data");
	if (data.status === "error") {
		throw new Error(data.error_message ?? "Voice processing failed");
	}
	return data;
}
