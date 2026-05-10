import { useEffect, useMemo, useState } from "react";
import {
	createGroup,
	getGroupDetail,
	getGroupFinanceSummary,
	joinGroup,
	leaveGroup,
	listGroupTransactions,
	listMyGroups,
	removeGroupMember,
	removeTransaction,
	requireAuthUid,
	updateGroupMemberRole,
	type GroupTransactionItem,
} from "@lib/firestore";
import { useI18nStore } from "@store/i18n.store";

type MemberRole = "admin" | "editor" | "viewer";
type ActiveTab = "anggota" | "keuangan";

interface GroupSummary {
	id: string;
	name: string;
	description?: string | null;
	owner_id: string;
	invite_code: string;
	invite_link: string;
	max_members: number;
	created_at: string;
}

interface GroupListItem {
	role: MemberRole;
	status: string;
	joined_at?: string;
	groups: GroupSummary;
}

interface GroupProfile {
	id: string;
	full_name: string;
	avatar_url?: string | null;
	email: string;
}

interface GroupMemberItem {
	id: string;
	group_id: string;
	user_id: string;
	role: MemberRole;
	status: string;
	joined_at?: string;
	profiles?: GroupProfile;
}

interface GroupDetail extends GroupSummary {
	members: GroupMemberItem[];
	my_role: MemberRole;
}

export default function GroupsPage() {
	const { language } = useI18nStore();
	const [groups, setGroups] = useState<GroupListItem[]>([]);
	const [selectedGroupId, setSelectedGroupId] = useState<string>("");
	const [selectedGroup, setSelectedGroup] = useState<GroupDetail | null>(null);
	const [activeTab, setActiveTab] = useState<ActiveTab>("anggota");
	const [newGroupName, setNewGroupName] = useState("");
	const [newGroupDescription, setNewGroupDescription] = useState("");
	const [joinCode, setJoinCode] = useState("");
	const [isLoadingList, setIsLoadingList] = useState(false);
	const [isLoadingDetail, setIsLoadingDetail] = useState(false);
	const [isCreating, setIsCreating] = useState(false);
	const [isJoining, setIsJoining] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	// Keuangan Bersama state
	const [groupTxs, setGroupTxs] = useState<GroupTransactionItem[]>([]);
	const [groupSummary, setGroupSummary] = useState<{
		total_income: number;
		total_expense: number;
		net: number;
		transaction_count: number;
	} | null>(null);
	const [isLoadingFinance, setIsLoadingFinance] = useState(false);
	const [myOnly, setMyOnly] = useState(false);

	useEffect(() => {
		void loadGroups();
	}, []);

	useEffect(() => {
		if (selectedGroupId) {
			void loadGroupDetail(selectedGroupId);
		}
	}, [selectedGroupId]);

	useEffect(() => {
		if (selectedGroupId && activeTab === "keuangan") {
			void loadGroupFinance(selectedGroupId);
		}
	}, [selectedGroupId, activeTab, myOnly]);

	const activeMembers = useMemo(
		() => selectedGroup?.members || [],
		[selectedGroup],
	);

	const loadGroups = async () => {
		setIsLoadingList(true);
		setError(null);
		try {
			const uid = requireAuthUid();
			const rows = await listMyGroups(uid);
			setGroups(rows as unknown as GroupListItem[]);

			if (!selectedGroupId && rows[0]?.groups?.id) {
				setSelectedGroupId(String(rows[0].groups.id));
			}
		} catch (err: any) {
			setError(err.message || "Gagal memuat daftar grup.");
		} finally {
			setIsLoadingList(false);
		}
	};

	const loadGroupFinance = async (groupId: string) => {
		setIsLoadingFinance(true);
		setError(null);
		try {
			const uid = requireAuthUid();
			const [txs, summary] = await Promise.all([
				listGroupTransactions(uid, groupId, { myOnly }),
				getGroupFinanceSummary(uid, groupId),
			]);
			setGroupTxs(txs);
			setGroupSummary(summary);
		} catch (err: any) {
			setError(err.message || "Gagal memuat keuangan grup.");
		} finally {
			setIsLoadingFinance(false);
		}
	};

	const handleDeleteGroupTx = async (txId: string) => {
		if (!window.confirm("Hapus transaksi ini dari keuangan bersama?")) return;
		setError(null);
		try {
			const uid = requireAuthUid();
			await removeTransaction(uid, txId);
			setMessage("Transaksi berhasil dihapus.");
			await loadGroupFinance(selectedGroupId);
		} catch (err: any) {
			setError(err.message || "Gagal menghapus transaksi.");
		}
	};

	const loadGroupDetail = async (groupId: string) => {
		setIsLoadingDetail(true);
		setError(null);
		try {
			const uid = requireAuthUid();
			const detail = await getGroupDetail(uid, groupId);
			setSelectedGroup(detail as unknown as GroupDetail);
		} catch (err: any) {
			setError(err.message || "Gagal memuat detail grup.");
		} finally {
			setIsLoadingDetail(false);
		}
	};

	const handleCreateGroup = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!newGroupName.trim()) return;

		setIsCreating(true);
		setError(null);
		setMessage(null);

		try {
			const uid = requireAuthUid();
			const group = await createGroup(uid, {
				name: newGroupName.trim(),
				description: newGroupDescription.trim() || undefined,
			});

			setNewGroupName("");
			setNewGroupDescription("");
			setMessage(`Grup "${group.name}" berhasil dibuat.`);
			await loadGroups();
			setSelectedGroupId(group.id);
		} catch (err: any) {
			setError(err.message || "Gagal membuat grup.");
		} finally {
			setIsCreating(false);
		}
	};

	const handleJoinGroup = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!joinCode.trim()) return;

		setIsJoining(true);
		setError(null);
		setMessage(null);

		try {
			const uid = requireAuthUid();
			const result = await joinGroup(uid, joinCode.trim().toUpperCase());
			setJoinCode("");
			setMessage(result.message);
			await loadGroups();
			setSelectedGroupId(String((result.group as unknown as GroupSummary).id));
		} catch (err: any) {
			setError(err.message || "Gagal bergabung ke grup.");
		} finally {
			setIsJoining(false);
		}
	};

	const handleLeaveGroup = async () => {
		if (!selectedGroup) return;
		if (!window.confirm(`Keluar dari grup "${selectedGroup.name}"?`)) return;

		setError(null);
		setMessage(null);

		try {
			const uid = requireAuthUid();
			await leaveGroup(uid, selectedGroup.id);
			setMessage("Berhasil keluar dari grup.");
			setSelectedGroup(null);
			setSelectedGroupId("");
			await loadGroups();
		} catch (err: any) {
			setError(err.message || "Gagal keluar dari grup.");
		}
	};

	const handleRoleChange = async (memberUserId: string, role: MemberRole) => {
		if (!selectedGroup) return;

		setError(null);
		setMessage(null);

		try {
			const uid = requireAuthUid();
			await updateGroupMemberRole(uid, selectedGroup.id, memberUserId, role);
			setMessage("Peran anggota berhasil diperbarui.");
			await loadGroupDetail(selectedGroup.id);
		} catch (err: any) {
			setError(err.message || "Gagal mengubah peran anggota.");
		}
	};

	const handleRemoveMember = async (memberUserId: string, fullName: string) => {
		if (!selectedGroup) return;
		if (!window.confirm(`Keluarkan ${fullName} dari grup?`)) return;

		setError(null);
		setMessage(null);

		try {
			const uid = requireAuthUid();
			await removeGroupMember(uid, selectedGroup.id, memberUserId);
			setMessage("Anggota berhasil dikeluarkan.");
			await loadGroupDetail(selectedGroup.id);
		} catch (err: any) {
			setError(err.message || "Gagal mengeluarkan anggota.");
		}
	};

	const isAdmin = selectedGroup?.my_role === "admin";

	return (
		<div className="animate-fade-in page-shell">
			<div className="groups-hero">
				<div className="page-header">
					<div>
						<p className="groups-eyebrow">
							{language === "id" ? "Fitur premium" : "Premium feature"}
						</p>
						<h2 className="page-title">
							{language === "id"
								? "Grup Keuangan Bersama"
								: "Shared Finance Groups"}
						</h2>
						<p className="page-subtitle">
							Sekarang halaman grup sudah tersambung ke backend: kamu bisa membuat
							grup, join pakai kode undangan, melihat anggota aktif, dan melakukan
							manajemen role dasar sesuai wireframe dan PRD.
						</p>
					</div>
					<span className="badge badge-info">Realtime backend</span>
				</div>
			</div>

			{error ? <StatusBox tone="danger" message={error} /> : null}
			{message ? <StatusBox tone="success" message={message} /> : null}

			<div className="groups-main-grid">
				<section className="card panel-card">
					<div className="panel-head">
						<h3 className="panel-title">{language === "id" ? "Grup Saya" : "My Groups"}</h3>
						<p className="panel-subtitle">
							{language === "id"
								? "Daftar grup aktif yang kamu ikuti."
								: "List of active groups you joined."}
						</p>
					</div>

					{isLoadingList ? (
						<EmptyBox
							message={
								language === "id"
									? "Memuat daftar grup..."
									: "Loading groups..."
							}
						/>
					) : groups.length === 0 ? (
						<EmptyBox message="Kamu belum punya grup aktif. Buat grup baru atau gabung pakai kode undangan." />
					) : (
						<div style={{ display: "grid", gap: "10px" }}>
							{groups.map((item) => {
								const active = item.groups.id === selectedGroupId;

								return (
									<button
										key={item.groups.id}
										type="button"
										onClick={() => setSelectedGroupId(item.groups.id)}
										className="card"
										style={{
											padding: "14px",
											textAlign: "left",
											cursor: "pointer",
											border: active
												? "1px solid var(--accent)"
												: "1px solid var(--border)",
											background: active
												? "var(--accent-light)"
												: "var(--bg-card)",
										}}
									>
										<div
											style={{
												display: "flex",
												justifyContent: "space-between",
												gap: "12px",
												marginBottom: "6px",
											}}
										>
											<div
												style={{
													fontSize: "14px",
													fontWeight: 700,
													color: "var(--text-primary)",
												}}
											>
												{item.groups.name}
											</div>
											<span className={`badge ${roleBadgeClass(item.role)}`}>
												{item.role}
											</span>
										</div>
										<div
											style={{
												fontSize: "12px",
												color: "var(--text-secondary)",
												lineHeight: 1.7,
											}}
										>
											{item.groups.description || "Belum ada deskripsi grup."}
										</div>
									</button>
								);
							})}
						</div>
					)}

					<section
						className="card"
						style={{ padding: "14px", background: "var(--bg-card2)" }}
					>
						<h4
							style={{
								fontSize: "14px",
								fontWeight: 700,
								color: "var(--text-primary)",
								marginBottom: "10px",
							}}
						>
							{language === "id" ? "Buat Grup Baru" : "Create New Group"}
						</h4>
						<form
							onSubmit={handleCreateGroup}
							style={{ display: "grid", gap: "10px" }}
						>
							<input
								className="form-input"
								value={newGroupName}
								onChange={(event) => setNewGroupName(event.target.value)}
								placeholder="Contoh: Keluarga Budiarto"
							/>
							<textarea
								className="form-input"
								rows={3}
								value={newGroupDescription}
								onChange={(event) => setNewGroupDescription(event.target.value)}
								placeholder="Deskripsi singkat grup"
								style={{ resize: "vertical" }}
							/>
							<button
								className="btn btn-primary"
								disabled={isCreating || !newGroupName.trim()}
							>
								{isCreating ? "Membuat..." : "Buat grup"}
							</button>
						</form>
					</section>

					<section
						className="card"
						style={{ padding: "14px", background: "var(--bg-card2)" }}
					>
						<h4
							style={{
								fontSize: "14px",
								fontWeight: 700,
								color: "var(--text-primary)",
								marginBottom: "10px",
							}}
						>
							{language === "id" ? "Gabung via Kode" : "Join via Code"}
						</h4>
						<form
							onSubmit={handleJoinGroup}
							style={{ display: "grid", gap: "10px" }}
						>
							<input
								className="form-input"
								value={joinCode}
								onChange={(event) =>
									setJoinCode(event.target.value.toUpperCase())
								}
								placeholder="Contoh: GRP8X2K"
							/>
							<button
								className="btn btn-secondary"
								disabled={isJoining || !joinCode.trim()}
							>
								{isJoining ? "Bergabung..." : "Gabung grup"}
							</button>
						</form>
					</section>
				</section>

				<section className="card panel-card">
					{!selectedGroupId ? (
						<EmptyBox message="Pilih salah satu grup di panel kiri untuk melihat detail." />
					) : isLoadingDetail ? (
						<EmptyBox message="Memuat detail grup..." />
					) : !selectedGroup ? (
						<EmptyBox message="Detail grup belum tersedia." />
					) : (
						<>
							{/* Header grup */}
							<div
								style={{
									background: "var(--g-card)",
									borderRadius: "14px",
									padding: "18px",
									color: "var(--on-brand)",
								}}
							>
								<div
									style={{
										fontSize: "20px",
										fontWeight: 700,
										marginBottom: "6px",
									}}
								>
									{selectedGroup.name}
								</div>
								<div
									style={{
										fontSize: "13px",
										color: "color-mix(in srgb, var(--on-brand) 86%, transparent)",
										lineHeight: 1.7,
										marginBottom: "14px",
									}}
								>
									{selectedGroup.description || "Belum ada deskripsi grup."}
								</div>
								<div
									style={{
										display: "grid",
										gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
										gap: "10px",
									}}
								>
									<HeroStat
										label="Anggota aktif"
										value={String(activeMembers.length)}
									/>
									<HeroStat
										label="Kapasitas"
										value={`${activeMembers.length}/${selectedGroup.max_members}`}
									/>
									<HeroStat label="Peran saya" value={selectedGroup.my_role} />
								</div>
							</div>

							{/* Tab switcher */}
							<div
								style={{
									display: "flex",
									gap: "8px",
									borderBottom: "1px solid var(--border)",
									paddingBottom: "2px",
								}}
							>
								{(["anggota", "keuangan"] as ActiveTab[]).map((tab) => (
									<button
										key={tab}
										type="button"
										onClick={() => setActiveTab(tab)}
										style={{
											padding: "8px 16px",
											fontSize: "13px",
											fontWeight: activeTab === tab ? 700 : 500,
											color:
												activeTab === tab
													? "var(--accent)"
													: "var(--text-secondary)",
											background: "none",
											border: "none",
											borderBottom:
												activeTab === tab
													? "2px solid var(--accent)"
													: "2px solid transparent",
											cursor: "pointer",
											marginBottom: "-1px",
										}}
									>
										{tab === "anggota" ? "Anggota" : "Keuangan Bersama"}
									</button>
								))}
							</div>

							{/* Tab: Anggota */}
							{activeTab === "anggota" && (
								<div className="groups-members-grid">
									<section
										className="card"
										style={{ padding: "14px", background: "var(--bg-card2)" }}
									>
										<div
											style={{
												display: "flex",
												justifyContent: "space-between",
												gap: "12px",
												marginBottom: "10px",
												flexWrap: "wrap",
											}}
										>
											<h4
												style={{
													fontSize: "14px",
													fontWeight: 700,
													color: "var(--text-primary)",
												}}
											>
												Anggota
											</h4>
											<span className="badge badge-info">
												{activeMembers.length} aktif
											</span>
										</div>
										<div style={{ display: "grid", gap: "10px" }}>
											{activeMembers.map((member) => {
												const fullName =
													member.profiles?.full_name ||
													member.profiles?.email ||
													"Anggota";
												const initials = getInitials(fullName);
												return (
													<div
														key={member.id}
														style={{
															border: "1px solid var(--border)",
															borderRadius: "12px",
															padding: "12px 14px",
															background: "var(--bg-card)",
														}}
													>
														<div
															style={{
																display: "flex",
																justifyContent: "space-between",
																gap: "12px",
																alignItems: "center",
																flexWrap: "wrap",
															}}
														>
															<div
																style={{
																	display: "flex",
																	gap: "10px",
																	alignItems: "center",
																}}
															>
																<div
																	style={{
																		width: "34px",
																		height: "34px",
																		borderRadius: "50%",
																		background: "var(--g-income)",
																		color: "var(--on-brand)",
																		display: "flex",
																		alignItems: "center",
																		justifyContent: "center",
																		fontSize: "12px",
																		fontWeight: 700,
																	}}
																>
																	{initials}
																</div>
																<div>
																	<div
																		style={{
																			fontSize: "13px",
																			fontWeight: 700,
																			color: "var(--text-primary)",
																		}}
																	>
																		{fullName}
																	</div>
																	<div
																		style={{
																			fontSize: "12px",
																			color: "var(--text-muted)",
																		}}
																	>
																		{member.profiles?.email ||
																			"Tidak ada email"}
																	</div>
																</div>
															</div>
															<div
																style={{
																	display: "flex",
																	gap: "8px",
																	alignItems: "center",
																	flexWrap: "wrap",
																}}
															>
																{isAdmin &&
																member.user_id !== selectedGroup.owner_id ? (
																	<select
																		className="form-input"
																		value={member.role}
																		onChange={(e) =>
																			handleRoleChange(
																				member.user_id,
																				e.target.value as MemberRole,
																			)
																		}
																		style={{ minWidth: "120px" }}
																	>
																		<option value="admin">admin</option>
																		<option value="editor">editor</option>
																		<option value="viewer">viewer</option>
																	</select>
																) : (
																	<span
																		className={`badge ${roleBadgeClass(member.role)}`}
																	>
																		{member.role}
																	</span>
																)}
																{isAdmin &&
																member.user_id !== selectedGroup.owner_id ? (
																	<button
																		className="btn btn-danger"
																		style={{
																			padding: "6px 10px",
																			fontSize: "12px",
																		}}
																		onClick={() =>
																			handleRemoveMember(
																				member.user_id,
																				fullName,
																			)
																		}
																	>
																		Keluarkan
																	</button>
																) : null}
															</div>
														</div>
													</div>
												);
											})}
										</div>
									</section>

									<section style={{ display: "grid", gap: "14px" }}>
										<div
											className="card"
											style={{ padding: "14px", background: "var(--bg-card2)" }}
										>
											<h4
												style={{
													fontSize: "14px",
													fontWeight: 700,
													color: "var(--text-primary)",
													marginBottom: "10px",
												}}
											>
												Undangan Grup
											</h4>
											<div style={{ display: "grid", gap: "10px" }}>
												<InviteBox
													label="Kode undangan"
													value={selectedGroup.invite_code}
													mono
												/>
												<InviteBox
													label="Link undangan"
													value={selectedGroup.invite_link}
												/>
											</div>
										</div>
										<div
											className="card"
											style={{ padding: "14px", background: "var(--bg-card2)" }}
										>
											<h4
												style={{
													fontSize: "14px",
													fontWeight: 700,
													color: "var(--text-primary)",
													marginBottom: "10px",
												}}
											>
												Aksi Grup
											</h4>
											<div style={{ display: "grid", gap: "10px" }}>
												<ActionRow
													title="Status peran"
													description={
														isAdmin
															? "Kamu admin. Bisa mengubah role anggota dan mengeluarkan member."
															: "Kamu bukan admin. Role management dibatasi."
													}
												/>
												<ActionRow
													title="Join via kode"
													description="Sudah aktif. Kamu juga bisa bagikan kode atau link ke anggota lain."
												/>
												<button
													className="btn btn-danger"
													style={{ justifySelf: "flex-start" }}
													onClick={handleLeaveGroup}
													disabled={selectedGroup.my_role === "admin"}
													title={
														selectedGroup.my_role === "admin"
															? "Admin harus transfer peran dulu sebelum keluar"
															: "Keluar dari grup"
													}
												>
													Keluar dari grup
												</button>
											</div>
										</div>
									</section>
								</div>
							)}

							{/* Tab: Keuangan Bersama */}
							{activeTab === "keuangan" && (
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										gap: "14px",
									}}
								>
									{/* Ringkasan */}
									{groupSummary && (
										<div
											style={{
												display: "grid",
												gridTemplateColumns:
													"repeat(auto-fit, minmax(140px, 1fr))",
												gap: "10px",
											}}
										>
											<SummaryCard
												label="Total Pemasukan"
												value={groupSummary.total_income}
												color="var(--green)"
											/>
											<SummaryCard
												label="Total Pengeluaran"
												value={groupSummary.total_expense}
												color="var(--red)"
											/>
											<SummaryCard
												label="Saldo Bersama"
												value={groupSummary.net}
												color={
													groupSummary.net >= 0 ? "var(--green)" : "var(--red)"
												}
											/>
										</div>
									)}

									{/* Filter */}
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: "10px",
										}}
									>
										<label
											style={{
												display: "flex",
												alignItems: "center",
												gap: "6px",
												fontSize: "13px",
												color: "var(--text-secondary)",
												cursor: "pointer",
											}}
										>
											<input
												type="checkbox"
												checked={myOnly}
												onChange={(e) => setMyOnly(e.target.checked)}
											/>
											Milik Saya
										</label>
										<span
											style={{ fontSize: "12px", color: "var(--text-muted)" }}
										>
											{groupTxs.length} transaksi
										</span>
									</div>

									{/* Daftar transaksi */}
									{isLoadingFinance ? (
										<EmptyBox message="Memuat keuangan bersama..." />
									) : groupTxs.length === 0 ? (
										<EmptyBox message="Belum ada transaksi bersama di grup ini. Tambahkan transaksi dan aktifkan 'Bagikan ke Grup' saat menyimpan." />
									) : (
										<div style={{ display: "grid", gap: "8px" }}>
											{groupTxs.map((tx) => {
												const uid = (() => {
													try {
														return requireAuthUid();
													} catch {
														return "";
													}
												})();
												const canEdit = isAdmin || tx.user_id === uid;
												return (
													<div
														key={`${tx.user_id}:${tx.id}`}
														style={{
															border: "1px solid var(--border)",
															borderRadius: "12px",
															padding: "12px 14px",
															background: "var(--bg-card)",
															display: "flex",
															justifyContent: "space-between",
															alignItems: "flex-start",
															gap: "12px",
															flexWrap: "wrap",
														}}
													>
														<div style={{ flex: 1 }}>
															<div
																style={{
																	display: "flex",
																	gap: "8px",
																	alignItems: "center",
																	marginBottom: "4px",
																	flexWrap: "wrap",
																}}
															>
																<span
																	style={{
																		fontSize: "13px",
																		fontWeight: 700,
																		color: "var(--text-primary)",
																	}}
																>
																	{tx.merchant || tx.note || tx.category}
																</span>
																<span
																	className={`badge ${tx.type === "income" ? "badge-ok" : "badge-warn"}`}
																>
																	{tx.type === "income" ? "+" : "-"}
																	{tx.amount.toLocaleString("id-ID")}
																</span>
															</div>
															<div
																style={{
																	fontSize: "12px",
																	color: "var(--text-muted)",
																}}
															>
																{tx.contributor_name} · {tx.date} ·{" "}
																{tx.category}
															</div>
														</div>
														{canEdit && (
															<button
																className="btn btn-danger"
																style={{
																	padding: "5px 10px",
																	fontSize: "12px",
																	flexShrink: 0,
																}}
																onClick={() => handleDeleteGroupTx(tx.id)}
															>
																Hapus
															</button>
														)}
													</div>
												);
											})}
										</div>
									)}
								</div>
							)}
						</>
					)}
				</section>
			</div>
		</div>
	);
}

function HeroStat({ label, value }: { label: string; value: string }) {
	return (
		<div
			style={{
				background: "var(--on-brand-surface)",
				border: "1px solid var(--on-brand-border)",
				borderRadius: "10px",
				padding: "10px 12px",
			}}
		>
			<div
				style={{
					fontSize: "10px",
					color: "var(--on-brand-soft)",
					marginBottom: "3px",
				}}
			>
				{label}
			</div>
			<div style={{ fontSize: "14px", fontWeight: 700 }}>{value}</div>
		</div>
	);
}

function InviteBox({
	label,
	value,
	mono = false,
}: {
	label: string;
	value: string;
	mono?: boolean;
}) {
	return (
		<div
			style={{
				border: "1px solid var(--border)",
				borderRadius: "12px",
				padding: "12px 14px",
				background: "var(--bg-card)",
			}}
		>
			<div
				style={{
					fontSize: "11px",
					color: "var(--text-muted)",
					marginBottom: "6px",
				}}
			>
				{label}
			</div>
			<div
				style={{
					fontSize: mono ? "18px" : "12px",
					fontWeight: 700,
					color: "var(--text-primary)",
					fontFamily: mono
						? "ui-monospace, SFMono-Regular, Consolas, monospace"
						: "inherit",
					wordBreak: "break-all",
				}}
			>
				{value}
			</div>
		</div>
	);
}

function ActionRow({
	title,
	description,
}: {
	title: string;
	description: string;
}) {
	return (
		<div
			style={{
				border: "1px solid var(--border)",
				borderRadius: "12px",
				padding: "12px 14px",
				background: "var(--bg-card)",
			}}
		>
			<div
				style={{
					fontSize: "13px",
					fontWeight: 700,
					color: "var(--text-primary)",
					marginBottom: "4px",
				}}
			>
				{title}
			</div>
			<div
				style={{
					fontSize: "12px",
					color: "var(--text-secondary)",
					lineHeight: 1.7,
				}}
			>
				{description}
			</div>
		</div>
	);
}

function StatusBox({
	tone,
	message,
}: {
	tone: "danger" | "success";
	message: string;
}) {
	const tones = {
		danger: {
			color: "var(--red)",
			background: "color-mix(in srgb, var(--red) 8%, transparent)",
			border: "1px solid color-mix(in srgb, var(--red) 16%, transparent)",
		},
		success: {
			color: "var(--green)",
			background: "color-mix(in srgb, var(--green) 8%, transparent)",
			border: "1px solid color-mix(in srgb, var(--green) 16%, transparent)",
		},
	} as const;

	return (
		<div
			style={{
				...tones[tone],
				borderRadius: "12px",
				padding: "10px 12px",
				fontSize: "12px",
				lineHeight: 1.7,
			}}
		>
			{message}
		</div>
	);
}

function EmptyBox({ message }: { message: string }) {
	return (
		<div
			style={{
				border: "1px dashed var(--border-strong)",
				borderRadius: "14px",
				padding: "28px 18px",
				textAlign: "center",
				color: "var(--text-muted)",
				fontSize: "13px",
				lineHeight: 1.7,
			}}
		>
			{message}
		</div>
	);
}

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((word) => word[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

function roleBadgeClass(
	role: MemberRole,
): "badge-info" | "badge-ok" | "badge-warn" {
	if (role === "admin") return "badge-info";
	if (role === "editor") return "badge-ok";
	return "badge-warn";
}

function SummaryCard({
	label,
	value,
	color,
}: {
	label: string;
	value: number;
	color: string;
}) {
	return (
		<div
			style={{
				border: "1px solid var(--border)",
				borderRadius: "12px",
				padding: "12px 14px",
				background: "var(--bg-card)",
			}}
		>
			<div
				style={{
					fontSize: "11px",
					color: "var(--text-muted)",
					marginBottom: "4px",
				}}
			>
				{label}
			</div>
			<div style={{ fontSize: "16px", fontWeight: 700, color }}>
				Rp {Math.abs(value).toLocaleString("id-ID")}
			</div>
		</div>
	);
}
