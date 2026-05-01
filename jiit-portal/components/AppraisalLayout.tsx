"use client";

import { ReactNode, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CheckCircle2, Circle, Clock, LogOut, Menu, X } from "lucide-react";
import { APPRAISAL_SECTIONS } from "@/lib/constants";
import {
	getAppraisalData,
	getUser,
	logout,
	isAuthenticated,
} from "@/lib/localStorage";
import { getAppraisalStatus } from "@/lib/api";
import { useSession, signOut } from "next-auth/react";
import { useServerSync } from "@/hooks/useServerSync";
import { AppraisalData, SectionStatus, ScoredItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import Image from "next/image";

interface AppraisalLayoutProps {
	children: ReactNode;
}

export default function AppraisalLayout({ children }: AppraisalLayoutProps) {
	const pathname = usePathname();
	const router = useRouter();
	// Initialize sidebar open state based on viewport: open on md+ by default, closed on mobile
	const [sidebarOpen, setSidebarOpen] = useState<boolean>(() =>
		typeof window !== "undefined" ? window.innerWidth >= 768 : true
	);
	const [appraisalData, setAppraisalDataState] = useState(getAppraisalData());
	const [adminStatus, setAdminStatus] = useState<string | null>(null);
	const { data: session, status } = useSession();

	// Hydrate localStorage from MongoDB on mount (handles new browser/incognito)
	useServerSync();

	const user =
		(session?.user as {
			name?: string | null;
			email?: string | null;
			image?: string | null;
			department?: string;
			id?: string;
		}) ?? getUser();

	// Refresh sidebar data when localStorage is hydrated from server
	const refreshData = useCallback(() => {
		setAppraisalDataState(getAppraisalData());
	}, []);

	useEffect(() => {
		// Listen for hydration events from useServerSync
		window.addEventListener("appraisal-data-hydrated", refreshData);
		return () => window.removeEventListener("appraisal-data-hydrated", refreshData);
	}, [refreshData]);

	useEffect(() => {
		// Wait for NextAuth session to resolve. If no NextAuth session AND no localStorage auth, redirect to login
		if (status === "loading") return;

		if (status === "unauthenticated" && !isAuthenticated()) {
			router.push("/login");
			return;
		}

		// Refresh appraisal data when location changes
		setAppraisalDataState(getAppraisalData());
		
		getAppraisalStatus().then((res: any) => {
			if (res) setAdminStatus(res.admin_status);
		});

		// If on a small screen, close the sidebar when navigating between sections
		if (typeof window !== "undefined" && window.innerWidth < 768) {
			setSidebarOpen(false);
		}
	}, [pathname, router, status]);

	const handleLogout = async () => {
		// Clear NextAuth session and localStorage data
		try {
			await signOut({ redirect: false });
		} catch {
			// ignore
		}
		logout();
		router.push("/login");
	};

	const getStatusIcon = (status: SectionStatus) => {
		switch (status) {
			case "completed":
				return <CheckCircle2 className="h-4 w-4 text-success" />;
			case "in_progress":
				return <Clock className="h-4 w-4 text-warning" />;
			default:
				return <Circle className="h-4 w-4 text-muted-foreground" />;
		}
	};

	const getStatusColor = (status: SectionStatus) => {
		switch (status) {
			case "completed":
				return "text-success";
			case "in_progress":
				return "text-warning";
			default:
				return "text-muted-foreground";
		}
	};

	return (
		<div className="min-h-screen bg-muted/30">
			{/* Header */}
			<header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
				<div className="flex h-16 items-center px-4 md:px-6">
					<Button
						variant="ghost"
						size="icon"
						className="mr-2 md:hidden"
						onClick={() => setSidebarOpen(!sidebarOpen)}
					>
						{sidebarOpen ? (
							<X className="h-5 w-5" />
						) : (
							<Menu className="h-5 w-5" />
						)}
					</Button>

					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg font-bold text-lg">
							<Image src="/logo.png" alt="JIIT Logo" width={32} height={32} />
						</div>
						<div>
							<h1 className="text-lg font-bold text-foreground">
								JIIT Faculty Appraisal
							</h1>
							<p className="text-xs text-muted-foreground hidden sm:block">
								Academic Year 2024-25
							</p>
						</div>
					</div>

					<div className="ml-auto flex items-center gap-4">
						<div className="text-right hidden sm:block">
							<p className="text-sm font-medium text-foreground">
								{user?.name || "Faculty Member"}
							</p>
							<p className="text-xs text-muted-foreground">
								{user?.department || "Department"}
							</p>
						</div>
						<Button variant="outline" size="sm" onClick={handleLogout}>
							<LogOut className="h-4 w-4 mr-2" />
							Logout
						</Button>
					</div>
				</div>
			</header>

			<div className="flex">
				{/* Sidebar */}
				<aside
					className={`${
						sidebarOpen ? "translate-x-0" : "-translate-x-full"
					} fixed md:sticky top-16 z-40 h-[calc(100vh-4rem)] w-72 overflow-y-auto border-r bg-card transition-transform duration-200 ease-in-out md:translate-x-0`}
				>
					<div className="p-4">
						<h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
							Appraisal Sections
						</h2>
						<nav className="space-y-1">
							{APPRAISAL_SECTIONS.map((section) => {
								// Map kebab-case section ids to AppraisalData camelCase keys
								const keyMap: Record<
									string,
									keyof ReturnType<typeof getAppraisalData>
								> = {
									"general-details": "generalDetails",
									"conference-events": "conferenceEvents",
									"lectures-tutorials": "lecturesTutorials",
									"reading-material": "readingMaterial",
									"project-guidance": "projectGuidance",
									"exam-duties": "examDuties",
									"student-activities": "studentActivities",
									"research-papers": "researchPapers",
									"books-chapters": "booksChapters",
									"research-projects": "researchProjects",
									"research-guidance": "researchGuidance",
									memberships: "memberships",
								};
								const dataKey = (keyMap[section.id] ??
									section.id) as keyof AppraisalData;
								const sectionData =
									appraisalData[dataKey as keyof AppraisalData];
								const statusKey =
									section.id in keyMap ? section.id : (section.id as string);
								const status =
									appraisalData.sectionStatus[statusKey] || "not_started";
								const apiScore =
									sectionData &&
									typeof sectionData === "object" &&
									sectionData !== null &&
									"apiScore" in (sectionData as ScoredItem)
										? (sectionData as ScoredItem).apiScore
										: null;
								const isActive = pathname === section.route;

								return (
									<Link
										key={section.id}
										href={section.route}
										className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
											isActive
												? "bg-primary text-primary-foreground font-medium"
												: "text-foreground hover:bg-accent"
										}`}
									>
										<span className={isActive ? "" : getStatusColor(status)}>
											{getStatusIcon(status)}
										</span>
										<span className="flex-1">{section.title}</span>
										{apiScore !== null && (
											<span
												className={`text-xs font-semibold ${
													isActive
														? "text-primary-foreground/80"
														: "text-primary"
												}`}
											>
												{apiScore}
											</span>
										)}
									</Link>
								);
							})}
						</nav>
					</div>
				</aside>

				{/* Main Content */}
				<main className="flex-1 p-4 md:p-8">
					<div className="mx-auto max-w-5xl">
						{(adminStatus === "Pending Review" || adminStatus === "Reviewed") && (
							<div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm font-medium flex items-center">
								<Clock className="w-5 h-5 mr-2" />
								This form is currently locked (Read-Only) because it is {adminStatus === "Reviewed" ? "already Approved" : "under Review"}. You cannot make changes at this time.
							</div>
						)}
						<div className={(adminStatus === "Pending Review" || adminStatus === "Reviewed") ? "pointer-events-none opacity-80 select-none" : ""}>
							{children}
						</div>
					</div>
				</main>
			</div>
		</div>
	);
}
