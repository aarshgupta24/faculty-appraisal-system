"use client";

import { useState, useMemo, useEffect } from "react";
import {
	Search,
	Download,
	FileText,
	CheckCircle2,
	XCircle,
	ChevronLeft,
	Users,
	Clock,
	BarChart3,
	FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { signOut } from "next-auth/react";
import { getAllFacultyData, updateAppraisalStatus } from "@/lib/api";

// --- TYPES ---
interface Faculty {
	id: string;
	name: string;
	designation: string;
	department: string;
	joiningDate: string;
	score: number;
	status: string;
	date: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	rawData: Record<string, any>;
}

export default function HODDashboard() {
	// --- STATE MANAGEMENT ---
	const [facultyList, setFacultyList] = useState<Faculty[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
	const [reviewScore, setReviewScore] = useState(0);
	const [reviewRemark, setReviewRemark] = useState("");
	const [activeTab, setActiveTab] = useState<"Pending Review" | "Reviewed" | "Returned">("Pending Review");
	const [isUpdating, setIsUpdating] = useState(false);

	// Fetch data on mount
	useEffect(() => {
		const fetchData = async () => {
			try {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const response = (await getAllFacultyData()) as { result: any[] };
				if (response?.result) {
					// Start with empty list
					const processedList: Faculty[] = [];

					// Iterate over each user's data blob
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					response.result.forEach((userDoc: any) => {
						const userId = userDoc.user_id;
						// Extract basic info from "1-10" section if available
						const basicInfo = userDoc["1-10"]?.data || {};
						const name = basicInfo.full_name || userId || "Unknown User";
						const designation = basicInfo.present_designation || "N/A";
						const department = basicInfo.department || "N/A";
						const joiningDate = basicInfo.institute_joining_date || "N/A";

						// Calculate total score from all sections
						let totalScore = 0;
						
						// 1. Calculate from backend root keys if they exist (ignoring metadata keys)
						const backendKeysToIgnore = ["user_id", "hod_review", "frontend_progress", "1-10", "_id"];
						Object.keys(userDoc).forEach((key) => {
							if (!backendKeysToIgnore.includes(key) && userDoc[key]?.score !== undefined) {
								totalScore += Number(userDoc[key].score) || 0;
							}
						});

						// 2. Add any scores from frontend_progress that might not be in root keys yet
						// (Especially generalDetails which is 10 points and doesn't save to a root .score)
						if (userDoc.frontend_progress) {
							Object.keys(userDoc.frontend_progress).forEach((fpKey) => {
								if (fpKey !== "sectionStatus") {
									const fpSection = userDoc.frontend_progress[fpKey];
									if (fpSection && typeof fpSection === "object" && typeof fpSection.apiScore === "number") {
										// Avoid double counting if backend already processed it
										// Backend keys are usually numbers (11, 12.1), frontend keys are camelCase
										// But since 'generalDetails' doesn't have a backend score key, we definitely add it.
										// To be safe and show exactly what frontend shows, we can just use frontend_progress scores 
										// for sections that haven't been finalized in backend root.
										// Actually, if we just want to match the frontend view, sum all frontend apiScores!
									}
								}
							});
						}
						
						// Re-evaluate: To match what the user sees on their dashboard, we should just
						// calculate the score exactly like `getTotalScore` in `lib/localStorage.ts`
						let calculatedScore = 0;
						if (userDoc.frontend_progress) {
							Object.keys(userDoc.frontend_progress).forEach((key) => {
								if (key !== "sectionStatus") {
									const section = userDoc.frontend_progress[key];
									if (section && typeof section === "object" && "apiScore" in section) {
										calculatedScore += Number(section.apiScore) || 0;
									}
								}
							});
						} else {
							// Fallback to backend keys
							Object.keys(userDoc).forEach((key) => {
								if (!backendKeysToIgnore.includes(key) && userDoc[key]?.score !== undefined) {
									calculatedScore += Number(userDoc[key].score) || 0;
								}
							});
							if (userDoc["1-10"]) {
								calculatedScore += 10; // Default score for general details if present
							}
						}

						totalScore = calculatedScore;

						// Determine status based on some logic, defaulting to "Submitted" if data exists
						const status = userDoc.admin_status || "Pending Review";

						processedList.push({
							id: userId,
							name,
							designation,
							department,
							joiningDate,
							score: totalScore,
							status,
							date: new Date().toISOString().split("T")[0], // Mock date
							rawData: userDoc, // Store all data for detailed view
						});
					});
					setFacultyList(processedList);
				}
			} catch (error) {
				console.error("Failed to fetch faculty data", error);
			} finally {
				setIsLoading(false);
			}
		};
		fetchData();
	}, []);

	// --- COMPUTED VALUES ---
	// Filter out Draft users so HOD only sees submitted forms
	const validFacultyList = facultyList.filter(f => f.status !== "Draft");

	const filteredFaculty = validFacultyList.filter((f) => {
		const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
		const matchesTab = f.status === activeTab;
		return matchesSearch && matchesTab;
	});

	const stats = useMemo(() => {
		const total = facultyList.length; // Total faculty in system
		const submitted = validFacultyList.length; // Faculty who have clicked "Final Submit"
		const pending = validFacultyList.filter(
			(f) => f.status === "Pending Review"
		).length;
		const totalScore = validFacultyList.reduce((acc, curr) => acc + curr.score, 0);
		const avg = submitted > 0 ? (totalScore / submitted).toFixed(1) : 0;
		return { total, submitted, pending, avg };
	}, [facultyList]);

	// --- ACTIONS ---
	const handleDownloadReport = () => {
		const headers = ["ID,Name,Designation,Department,Score,Status,Date\n"];
		const rows = facultyList.map(
			(f) =>
				`${f.id},"${f.name}","${f.designation}","${f.department}",${f.score},"${f.status}","${f.date}"`
		);
		const csvContent =
			"data:text/csv;charset=utf-8," + headers + rows.join("\n");
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement("a");
		link.setAttribute("href", encodedUri);
		link.setAttribute("download", "faculty_appraisal_report.csv");
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	const handleOpenReview = (faculty: Faculty) => {
		setSelectedFaculty(faculty);
		setReviewScore(faculty.score);
		setReviewRemark("");
	};

	const handleApprove = async () => {
		if (!selectedFaculty) return;
		setIsUpdating(true);
		try {
			await updateAppraisalStatus(selectedFaculty.id, "Reviewed", reviewScore, reviewRemark);
			const updatedList = facultyList.map((f) => {
				if (f.id === selectedFaculty.id)
					return { ...f, status: "Reviewed", score: reviewScore };
				return f;
			});
			setFacultyList(updatedList);
			setSelectedFaculty(null);
		} catch (error) {
			console.error("Failed to approve:", error);
			alert("Failed to update status. Please try again.");
		} finally {
			setIsUpdating(false);
		}
	};

	const handleSendBack = async () => {
		if (!selectedFaculty) return;
		setIsUpdating(true);
		try {
			await updateAppraisalStatus(selectedFaculty.id, "Returned", reviewScore, reviewRemark);
			const updatedList = facultyList.map((f) => {
				if (f.id === selectedFaculty.id) return { ...f, status: "Returned" };
				return f;
			});
			setFacultyList(updatedList);
			setSelectedFaculty(null);
		} catch (error) {
			console.error("Failed to send back:", error);
			alert("Failed to update status. Please try again.");
		} finally {
			setIsUpdating(false);
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "Reviewed":
				return "bg-green-100 text-green-700 border-green-200";
			case "Pending Review":
				return "bg-amber-100 text-amber-700 border-amber-200";
			case "Returned":
				return "bg-red-100 text-red-700 border-red-200";
			default:
				return "bg-slate-100 text-slate-700 border-slate-200";
		}
	};

	// Helper to extract images from raw data
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const getProofImages = (facultyData: any) => {
		const images: string[] = [];
		if (!facultyData) return images;

		// Traverse all sections
		Object.keys(facultyData).forEach((sectionKey) => {
			const section = facultyData[sectionKey];
			// Check for 'data' array in section
			if (section?.data && Array.isArray(section.data)) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				section.data.forEach((item: any) => {
					if (item.proof_files && Array.isArray(item.proof_files)) {
						item.proof_files.forEach((file: string) => {
							if (
								file &&
								typeof file === "string" &&
								file.startsWith("data:image")
							) {
								images.push(file);
							}
						});
					}
				});
			}
			// Check for specific api_score_list structures where proof_files might be nested differently?
			// The backend transformer ensures it's in the data item, so the above loop should catch it.
		});
		return images;
	};

	// --- VIEW 2: REVIEW MODE ---
	if (selectedFaculty) {
		const proofImages = getProofImages(selectedFaculty.rawData);

		return (
			<div className="min-h-screen bg-muted/30 p-4 md:p-8">
				<div className="max-w-6xl mx-auto">
					<Button
						variant="ghost"
						className="mb-6 pl-0 hover:pl-2 transition-all"
						onClick={() => setSelectedFaculty(null)}
					>
						<ChevronLeft className="h-4 w-4 mr-2" /> Back to Dashboard
					</Button>
					<div className="grid gap-6 md:grid-cols-3">
						<div className="md:col-span-2 space-y-6">
							<Card>
								<CardHeader>
									<div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
										<div>
											<CardTitle className="text-xl md:text-2xl">
												{selectedFaculty.name}
											</CardTitle>
											<CardDescription>
												{selectedFaculty.designation}
											</CardDescription>
										</div>
										<Badge
											variant="outline"
											className={getStatusColor(selectedFaculty.status)}
										>
											{selectedFaculty.status}
										</Badge>
									</div>
								</CardHeader>
								<CardContent className="space-y-6">
									<div className="p-4 bg-white border rounded-md shadow-sm">
										<h3 className="font-semibold mb-2 flex items-center">
											<FileText className="h-4 w-4 mr-2 text-primary" /> General
											Information
										</h3>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
											<div>
												<span className="block font-medium text-foreground">
													Department
												</span>{" "}
												{selectedFaculty.department}
											</div>
											<div>
												<span className="block font-medium text-foreground">
													Joining Date
												</span>{" "}
												{selectedFaculty.joiningDate}
											</div>
										</div>
									</div>

									{/* Proof Images Section */}
									{proofImages.length > 0 && (
										<div className="p-4 bg-white border rounded-md shadow-sm">
											<h3 className="font-semibold mb-4 flex items-center">
												<FileCheck className="h-4 w-4 mr-2 text-primary" />{" "}
												Proof Documents
											</h3>
											<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
												{proofImages.map((imgSrc, idx) => (
													<div
														key={idx}
														className="relative group overflow-hidden rounded-md border aspect-[3/4]"
													>
														<Image
															src={imgSrc}
															alt={`Proof ${idx + 1}`}
															fill
															className="object-cover transition-transform hover:scale-105"
															unoptimized
														/>
														<div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
															<Button
																size="sm"
																variant="secondary"
																onClick={() => {
																	const win = window.open();
																	win?.document.write(
																		'<img src="' +
																			imgSrc +
																			'" style="max-width:100%; height:auto;">'
																	);
																}}
															>
																View Full
															</Button>
														</div>
													</div>
												))}
											</div>
										</div>
									)}

									<div className="p-4 bg-white border rounded-md shadow-sm">
										<h3 className="font-semibold mb-2 flex items-center">
											<FileText className="h-4 w-4 mr-2 text-primary" />{" "}
											Research & Publications
										</h3>
										<p className="text-sm text-muted-foreground mb-2">
											Original Claim:{" "}
											<span className="text-foreground font-bold">
												{selectedFaculty.score}
											</span>
										</p>
										<div className="text-sm space-y-2">
											{/* Render raw data scores to verify claims */}
											{Object.keys(selectedFaculty.rawData).map((key) => {
												const keysToIgnore = ["1-10", "user_id", "hod_review", "frontend_progress", "_id"];
												if (keysToIgnore.includes(key)) return null;
												const sectionData = selectedFaculty.rawData[key];
												if (!sectionData || typeof sectionData !== "object") return null;
												
												return (
													<div
														key={key}
														className="border-l-2 border-primary/20 pl-3 py-1"
													>
														<span className="font-medium text-xs uppercase text-muted-foreground">
															Item {key}
														</span>
														<div className="text-xs truncate max-w-full text-foreground/80">
															Score: {sectionData.score || 0}
														</div>
													</div>
												);
											})}

											{/* Render frontend_progress scores for sections like generalDetails */}
											{selectedFaculty.rawData.frontend_progress && 
												Object.keys(selectedFaculty.rawData.frontend_progress).map((fpKey) => {
													if (fpKey === "sectionStatus") return null;
													const fpSection = selectedFaculty.rawData.frontend_progress[fpKey];
													if (!fpSection || typeof fpSection !== "object" || !("apiScore" in fpSection)) return null;
													
													return (
														<div
															key={`fp-${fpKey}`}
															className="border-l-2 border-primary/20 pl-3 py-1 bg-muted/20"
														>
															<span className="font-medium text-xs uppercase text-muted-foreground">
																{fpKey.replace(/([A-Z])/g, ' $1').trim()} (Frontend)
															</span>
															<div className="text-xs truncate max-w-full text-foreground/80">
																Score: {fpSection.apiScore || 0}
															</div>
														</div>
													);
												})
											}
											
											{/* Fallback for general details if frontend_progress is missing but 1-10 exists */}
											{!selectedFaculty.rawData.frontend_progress && selectedFaculty.rawData["1-10"] && (
												<div className="border-l-2 border-primary/20 pl-3 py-1 bg-muted/20">
													<span className="font-medium text-xs uppercase text-muted-foreground">
														General Details (Fallback)
													</span>
													<div className="text-xs truncate max-w-full text-foreground/80">
														Score: 10
													</div>
												</div>
											)}
										</div>
									</div>
								</CardContent>
							</Card>
						</div>
						<div className="md:col-span-1">
							<Card className="sticky top-6">
								<CardHeader>
									<CardTitle>HOD Review</CardTitle>
									<CardDescription>
										Validate score and add remarks
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="space-y-2">
										<label className="text-sm font-medium">
											Verified Score
										</label>
										<input
											type="number"
											className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
											value={reviewScore}
											onChange={(e) => setReviewScore(Number(e.target.value))}
										/>
									</div>
									<div className="space-y-2">
										<label className="text-sm font-medium">Remarks</label>
										<textarea
											className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none"
											placeholder="Enter specific feedback..."
											value={reviewRemark}
											onChange={(e) => setReviewRemark(e.target.value)}
										/>
									</div>
									<div className="pt-2 flex flex-col gap-3">
										<Button
											className="w-full bg-green-600 hover:bg-green-700"
											onClick={handleApprove}
											disabled={isUpdating}
										>
											<CheckCircle2 className="mr-2 h-4 w-4" /> {isUpdating ? "Processing..." : "Approve Appraisal"}
										</Button>
										<Button
											variant="outline"
											className="w-full text-red-600 hover:bg-red-50 hover:text-red-700"
											onClick={handleSendBack}
											disabled={isUpdating}
										>
											<XCircle className="mr-2 h-4 w-4" /> {isUpdating ? "Processing..." : "Send Back"}
										</Button>
									</div>
								</CardContent>
							</Card>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// --- VIEW 1: MAIN DASHBOARD ---
	return (
		<div className="min-h-screen bg-muted/30">
			<div className="container mx-auto px-4 py-8 max-w-7xl">
				{/* Header Section - Stacked on Mobile */}
				<div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
					<div>
						<h1 className="text-3xl font-bold tracking-tight">
							Department Dashboard
						</h1>
						<p className="text-muted-foreground">
							Overview of faculty performance appraisals
						</p>
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="ghost"
							onClick={() => signOut({ callbackUrl: "/login" })}
							className="hidden md:inline-flex"
						>
							Logout
						</Button>
						<Button
							variant="outline"
							onClick={handleDownloadReport}
							className="w-full md:w-auto"
						>
							<Download className="mr-2 h-4 w-4" /> Download Report
						</Button>
					</div>
				</div>

				{isLoading ? (
					<div className="p-12 flex justify-center text-muted-foreground">
						Loading dashboard data...
					</div>
				) : (
					<>
						{/* Live Analytics Cards */}
						<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
							<Card>
								<CardHeader className="flex flex-row items-center justify-between pb-2">
									<CardTitle className="text-sm font-medium">
										Total Faculty
									</CardTitle>
									<Users className="h-4 w-4 text-muted-foreground" />
								</CardHeader>
								<CardContent>
									<div className="text-2xl font-bold">{stats.total}</div>
									<p className="text-xs text-muted-foreground">
										Active members
									</p>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className="flex flex-row items-center justify-between pb-2">
									<CardTitle className="text-sm font-medium">
										Submissions
									</CardTitle>
									<FileCheck className="h-4 w-4 text-blue-500" />
								</CardHeader>
								<CardContent>
									<div className="text-2xl font-bold">{stats.submitted}</div>
									<Progress
										value={
											stats.total > 0
												? (stats.submitted / stats.total) * 100
												: 0
										}
										className="h-2 mt-2"
									/>
									<p className="text-xs text-muted-foreground mt-1">
										{stats.total > 0
											? ((stats.submitted / stats.total) * 100).toFixed(0)
											: 0}
										% Completed
									</p>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className="flex flex-row items-center justify-between pb-2">
									<CardTitle className="text-sm font-medium">
										Pending Reviews
									</CardTitle>
									<Clock className="h-4 w-4 text-amber-500" />
								</CardHeader>
								<CardContent>
									<div className="text-2xl font-bold">{stats.pending}</div>
									<p className="text-xs text-muted-foreground">
										Requires attention
									</p>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className="flex flex-row items-center justify-between pb-2">
									<CardTitle className="text-sm font-medium">
										Avg. Score
									</CardTitle>
									<BarChart3 className="h-4 w-4 text-green-500" />
								</CardHeader>
								<CardContent>
									<div className="text-2xl font-bold">{stats.avg}</div>
									<p className="text-xs text-muted-foreground">
										Based on submitted
									</p>
								</CardContent>
							</Card>
						</div>

						{/* Responses Table */}
						<Card>
							<CardHeader>
								<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
									<div>
										<CardTitle>Faculty Submissions</CardTitle>
										<CardDescription>
											Manage and review submitted forms
										</CardDescription>
									</div>
									<div className="flex flex-col sm:flex-row items-center gap-4">
										{/* Tabs */}
										<div className="flex bg-muted p-1 rounded-md">
											<Button
												variant={activeTab === "Pending Review" ? "default" : "ghost"}
												size="sm"
												className="rounded-sm"
												onClick={() => setActiveTab("Pending Review")}
											>
												Pending
											</Button>
											<Button
												variant={activeTab === "Reviewed" ? "default" : "ghost"}
												size="sm"
												className="rounded-sm"
												onClick={() => setActiveTab("Reviewed")}
											>
												Approved
											</Button>
											<Button
												variant={activeTab === "Returned" ? "default" : "ghost"}
												size="sm"
												className="rounded-sm"
												onClick={() => setActiveTab("Returned")}
											>
												Sent Back
											</Button>
										</div>
										<div className="relative w-full sm:w-64">
											<Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
											<input
												placeholder="Search name..."
												className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pl-8 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
												value={searchQuery}
												onChange={(e) => setSearchQuery(e.target.value)}
											/>
										</div>
									</div>
								</div>
							</CardHeader>
							<CardContent>
								{/* THIS LINE FIXES THE TABLE SCROLL ISSUE */}
								<div className="rounded-md border overflow-x-auto">
									<table className="w-full text-sm text-left min-w-[800px]">
										<thead className="bg-muted/50 font-medium text-muted-foreground">
											<tr>
												<th className="p-4">Faculty Name</th>
												<th className="p-4">Designation</th>
												<th className="p-4">Submitted Date</th>
												<th className="p-4">API Score</th>
												<th className="p-4">Status</th>
												<th className="p-4 text-right">Action</th>
											</tr>
										</thead>
										<tbody>
											{filteredFaculty.length > 0 ? (
												filteredFaculty.map((faculty) => (
													<tr
														key={faculty.id}
														className="border-t hover:bg-muted/50 transition-colors"
													>
														<td className="p-4 font-medium whitespace-nowrap">
															{faculty.name}
														</td>
														<td className="p-4 whitespace-nowrap">
															{faculty.designation}
														</td>
														<td className="p-4 text-muted-foreground whitespace-nowrap">
															{faculty.date}
														</td>
														<td className="p-4 font-bold">{faculty.score}</td>
														<td className="p-4">
															<Badge
																variant="outline"
																className={getStatusColor(faculty.status)}
															>
																{faculty.status}
															</Badge>
														</td>
														<td className="p-4 text-right">
															<Button
																size="sm"
																variant="outline"
																disabled={faculty.status === "Not Submitted"}
																onClick={() => handleOpenReview(faculty)}
																className="w-28"
															>
																{faculty.status === "Reviewed"
																	? "View Details"
																	: "Review"}
															</Button>
														</td>
													</tr>
												))
											) : (
												<tr>
													<td
														colSpan={6}
														className="p-8 text-center text-muted-foreground"
													>
														No faculty found matching &quot;{searchQuery}&quot;
													</td>
												</tr>
											)}
										</tbody>
									</table>
								</div>
							</CardContent>
						</Card>
					</>
				)}
			</div>
		</div>
	);
}
