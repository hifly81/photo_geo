export type PhotoSuggestions = {
    caption?: string;
    takenAt?: string;
    latitude?: number;
    longitude?: number;
    country?: string;
    placeName?: string;
    city?: string;
    tags?: string[];
};

export type PhotoSuggestionsResponse = {
    photoId: string;
    suggestions: PhotoSuggestions;
};