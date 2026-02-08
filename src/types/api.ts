import type { Sprint } from "@/types";

export type RawSprint = Omit<Sprint, "dailyPlans"> & {
    dailyPlans: Sprint["dailyPlans"] | string | null;
};
