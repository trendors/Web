export interface Campaign {
    id: number;
    name: string;
    creator_id: number;
    link: string;
    description: string;
    package: string;
    generate_post?: boolean;
    files?: string[];
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
}

export interface ApiResponse<T = null> {
    message: string;
    error: boolean;
    data?: T;
}