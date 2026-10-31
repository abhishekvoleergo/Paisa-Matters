import { apiClient } from "./client";

/** Frontend page paths. Keep these aligned with app/trips and app/join route folders. */
export const tripRoutes = {
  home: "/home",
  details: (tripId: string) => `/trips/${encodeURIComponent(tripId)}`,
  edit: (tripId: string) => `/trips/${encodeURIComponent(tripId)}/edit`,
  settlements: (tripId: string) => `/trips/${encodeURIComponent(tripId)}/settlements`,
  join: (inviteToken: string) => `/join/${encodeURIComponent(inviteToken)}`,
};

/** API paths are relative to the /api base URL configured in the Axios client. */
export const tripApiRoutes = {
  collection: "/trips",
  myJoinRequests: "/trips/join-requests/mine",
  ownerJoinRequests: "/trips/join-requests/owner",
  approveJoinRequest: (requestId: string) => "/trips/join-requests/" + encodeURIComponent(requestId) + "/approve",
  rejectJoinRequest: (requestId: string) => "/trips/join-requests/" + encodeURIComponent(requestId) + "/reject",
  cancelJoinRequest: (requestId: string) => "/trips/join-requests/" + encodeURIComponent(requestId) + "/cancel",
  clearJoinRequest: (requestId: string) => "/trips/join-requests/" + encodeURIComponent(requestId) + "/clear",
  clearAllJoinRequests: "/trips/join-requests/clear-all",
  byId: (tripId: string) => `/trips/${encodeURIComponent(tripId)}`,
  members: (tripId: string) => `/trips/${encodeURIComponent(tripId)}/members`,
  invites: (tripId: string) => `/trips/${encodeURIComponent(tripId)}/invites`,
  inviteByToken: (token: string) => `/invites/${encodeURIComponent(token)}`,
  joinByToken: (token: string) => `/invites/${encodeURIComponent(token)}/join`,
};

export type CreateTripRequest = {
  tripName: string;
  destination: string;
  startDate?: string;
  endDate?: string;
};

export type Trip = {
  tripId: string;
  tripName: string;
  destination: string;
  createdBy: string | null;
  startDate: string | null;
  endDate: string | null;
  currencyCode: "INR";
  createdAt: string | null;
  memberRole?: string | null;
  memberStatus?: string | null;
};

export type UpdateTripRequest = CreateTripRequest;
export type TripMember = {
  userId: string;
  fullName: string;
  role: "Owner" | "Member" | string;
  status: "Active" | "Removed" | string;
  joinedAt: string | null;
};
export type TripDetails = Trip & {
  ownerName: string;
  currentUserRole: string;
  memberCount: number;
  updatedAt: string | null;
};
export type TripInvite = { inviteUrl: string; expiresAt: string | null; maxUses: number | null };
export type InvitePreview = {
  valid: boolean;
  status: "Valid" | "Expired" | "Exhausted" | "Invalid" | string;
  tripId: string | null;
  tripName: string | null;
  destination: string | null;
  expiresAt: string | null;
  maxUses: number | null;
  useCount: number | null;
};
export type JoinTripResult = { requestId: string | null; tripId: string; status: "Pending" | "AlreadyMember" | string };
export type TripJoinRequest = {
  requestId: string;
  tripId: string;
  tripName: string;
  destination: string;
  status: "Pending" | "Approved" | "Rejected" | "Cancelled" | "Expired" | string;
  requestedAt: string;
  respondedAt: string | null;
};
export type OwnerJoinRequest = TripJoinRequest & {
  applicantUserId: string;
  applicantName: string;
  applicantEmail: string;
  clearedAt: string | null;
};
export type JoinRequestAction = {
  requestId: string;
  tripId: string;
  status: string;
  requestedAt: string;
  respondedAt: string | null;
  clearedAt: string | null;
};

export const tripsApi = {
  async create(request: CreateTripRequest): Promise<Trip> {
    const response = await apiClient.post<Trip>(tripApiRoutes.collection, request);
    return response.data;
  },
  async list(): Promise<Trip[]> {
    const response = await apiClient.get<Trip[]>(tripApiRoutes.collection);
    return response.data;
  },
  async getById(tripId: string): Promise<TripDetails> {
    const response = await apiClient.get<TripDetails>(tripApiRoutes.byId(tripId));
    return response.data;
  },
  async update(tripId: string, request: UpdateTripRequest): Promise<TripDetails> {
    const response = await apiClient.put<TripDetails>(tripApiRoutes.byId(tripId), request);
    return response.data;
  },
  async remove(tripId: string): Promise<void> {
    await apiClient.delete(tripApiRoutes.byId(tripId));
  },
  async getMembers(tripId: string): Promise<TripMember[]> {
    const response = await apiClient.get<TripMember[]>(tripApiRoutes.members(tripId));
    return response.data;
  },
  async createInvite(tripId: string, options: { expiresAt?: string | null; maxUses?: number | null } = {}): Promise<TripInvite> {
    const response = await apiClient.post<TripInvite>(tripApiRoutes.invites(tripId), options);
    return response.data;
  },
  async previewInvite(token: string): Promise<InvitePreview> {
    const response = await apiClient.get<InvitePreview>(tripApiRoutes.inviteByToken(token));
    return response.data;
  },
  async joinByInvite(token: string): Promise<JoinTripResult> {
    const response = await apiClient.post<JoinTripResult>(tripApiRoutes.joinByToken(token));
    return response.data;
  },
  async myJoinRequests(): Promise<TripJoinRequest[]> {
    const response = await apiClient.get<TripJoinRequest[]>(tripApiRoutes.myJoinRequests);
    return response.data;
  },
  async ownerJoinRequests(includeCleared = false): Promise<OwnerJoinRequest[]> {
    const response = await apiClient.get<OwnerJoinRequest[]>(tripApiRoutes.ownerJoinRequests, { params: { includeCleared } });
    return response.data;
  },
  async approveJoinRequest(requestId: string): Promise<JoinRequestAction> {
    const response = await apiClient.post<JoinRequestAction>(tripApiRoutes.approveJoinRequest(requestId));
    return response.data;
  },
  async rejectJoinRequest(requestId: string): Promise<JoinRequestAction> {
    const response = await apiClient.post<JoinRequestAction>(tripApiRoutes.rejectJoinRequest(requestId));
    return response.data;
  },
  async cancelJoinRequest(requestId: string): Promise<JoinRequestAction> {
    const response = await apiClient.post<JoinRequestAction>(tripApiRoutes.cancelJoinRequest(requestId));
    return response.data;
  },
  async clearJoinRequest(requestId: string): Promise<JoinRequestAction> {
    const response = await apiClient.post<JoinRequestAction>(tripApiRoutes.clearJoinRequest(requestId));
    return response.data;
  },
  async clearAllJoinRequests(): Promise<number> {
    const response = await apiClient.post<{ clearedCount: number }>(tripApiRoutes.clearAllJoinRequests);
    return response.data.clearedCount;
  },
};
