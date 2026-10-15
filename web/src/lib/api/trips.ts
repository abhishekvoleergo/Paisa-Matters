import { apiClient } from "./client";

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

export const tripsApi = {
  async create(request: CreateTripRequest): Promise<Trip> {
    const response = await apiClient.post<Trip>("/trips", request);
    return response.data;
  },
  async list(): Promise<Trip[]> {
    const response = await apiClient.get<Trip[]>("/trips");
    return response.data;
  },
};
