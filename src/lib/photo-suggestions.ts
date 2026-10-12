import path from 'node:path';
import { promises as fs } from 'node:fs';
import * as exifr from 'exifr';
import { prisma } from '@/lib/prisma';
import { reverseGeocode } from '@/lib/reverse-geocode';
import type { PhotoSuggestions } from '@/types/photo-suggestions';

type AnalyzerOutput = {
    caption?: string | null;
    takenAt?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    country?: string | null;
    placeName?: string | null;
    city?: string | null;
    tags?: string[] | null;
};

const filenameNoiseTokens = new Set([
    'img',
    'image',
    'photo',
    'picture',
    'dsc',
    'dcim',
    'scan',
    'screenshot',
    'pxl',
    'mvimg',
    'edited',
    'edit',
    'copy',
    'fullsizeoutput',
    'full',
    'output',
    'original',
    'version',
    'final',
    'export',
    'exported',
    'processed',
    'backup',
    'temp',
    'tmp'
]);

function isBlank(value: string | null | undefined) {
    return !value || !value.trim();
}

function normalizeTag(tag: string) {
    return tag.trim().toLowerCase();
}

function getPhotoStorageRoots(): Record<string, string> {
    const raw = process.env.PHOTO_STORAGE_ROOTS?.trim();

    if (!raw) {
        return {};
    }

    try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;

        return Object.fromEntries(
            Object.entries(parsed).filter(
                (entry): entry is [string, string] =>
                    typeof entry[0] === 'string' &&
                    typeof entry[1] === 'string' &&
                    entry[1].trim().length > 0
            )
        );
    } catch {
        return {};
    }
}

function resolveAbsolutePath(storageKey: string, filePath: string) {
    if (path.isAbsolute(filePath)) {
        return filePath;
    }

    const roots = getPhotoStorageRoots();
    const root = roots[storageKey];

    if (!root) {
        throw new Error(`No storage root configured for storageKey "${storageKey}"`);
    }

    return path.resolve(root, filePath);
}

function isValidCoordinate(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function toIsoStringIfValid(value: unknown): string | null {
    if (!value) return null;

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value.toISOString();
    }

    if (typeof value === 'string') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
    }

    return null;
}

function stripExtension(filename: string) {
    return filename.replace(/\.[^/.]+$/, '');
}

function normalizeFilenameForText(filename: string) {
    return stripExtension(filename)
        .replace(/[_\-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function compactDigitsOnly(value: string) {
    return value.replace(/\D+/g, '');
}

function isCameraStyleFilename(value: string) {
    return /^(img|dsc|pxl|mvimg|screenshot)[\s_-]?\d+/i.test(value);
}

function isPureNumericOrDatetimeFilename(value: string) {
    const compact = compactDigitsOnly(value);

    if (!compact) return false;
    if (/^\d+$/.test(value.replace(/\s+/g, ''))) return true;
    if (/^20\d{6}$/.test(compact)) return true;
    if (/^20\d{12}$/.test(compact)) return true;

    return false;
}

function looksMeaningfulAsHumanText(value: string) {
    const normalized = normalizeFilenameForText(value);
    if (!normalized) return false;
    if (isCameraStyleFilename(normalized)) return false;
    if (isPureNumericOrDatetimeFilename(normalized)) return false;

    const tokens = normalized
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);

    if (tokens.length === 0) return false;

    const meaningfulTokens = tokens.filter((token) => {
        if (/^\d+$/.test(token)) return false;
        if (filenameNoiseTokens.has(token)) return false;
        if (token.length < 3) return false;
        return true;
    });

    return meaningfulTokens.length > 0;
}

function extractDateFromFilename(originalFilename: string): string | null {
    const base = stripExtension(originalFilename);

    const patterns: RegExp[] = [
        /\b(20\d{2})(\d{2})(\d{2})[_-]?(\d{2})(\d{2})(\d{2})\b/,
        /\b(20\d{2})(\d{2})(\d{2})\b/,
        /\b(20\d{2})[-_](\d{2})[-_](\d{2})[-_](\d{2})[-_](\d{2})[-_](\d{2})\b/,
        /\b(20\d{2})[-_](\d{2})[-_](\d{2})\b/
    ];

    for (const pattern of patterns) {
        const match = base.match(pattern);
        if (!match) continue;

        const [, year, month, day, hour = '00', minute = '00', second = '00'] = match;

        const y = Number(year);
        const m = Number(month);
        const d = Number(day);
        const hh = Number(hour);
        const mm = Number(minute);
        const ss = Number(second);

        if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d) || !Number.isInteger(hh) || !Number.isInteger(mm) || !Number.isInteger(ss)) {
            continue;
        }

        if (m < 1 || m > 12) continue;
        if (d < 1 || d > 31) continue;
        if (hh < 0 || hh > 23) continue;
        if (mm < 0 || mm > 59) continue;
        if (ss < 0 || ss > 59) continue;

        const parsed = new Date(Date.UTC(y, m - 1, d, hh, mm, ss));

        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toISOString();
        }
    }

    return null;
}

function extractTagsFromFilename(originalFilename: string): string[] {
    const normalized = normalizeFilenameForText(originalFilename).toLowerCase();

    if (!normalized) return [];
    if (isCameraStyleFilename(normalized)) return [];
    if (isPureNumericOrDatetimeFilename(normalized)) return [];

    return normalized
        .split(/\s+/)
        .filter((token) => token.length >= 3)
        .filter((token) => !/^\d+$/.test(token))
        .filter((token) => !/^20\d{2}$/.test(token))
        .filter((token) => !filenameNoiseTokens.has(token))
        .filter((token) => !/^\d{1,2}[ap]m$/.test(token))
        .filter((token) => !/^\d{6,}$/.test(token))
        .filter((token, index, array) => array.indexOf(token) === index)
        .slice(0, 8);
}

function buildCaptionFromFilename(originalFilename: string): string | null {
    if (!looksMeaningfulAsHumanText(originalFilename)) {
        return null;
    }

    const normalized = normalizeFilenameForText(originalFilename);

    const meaningfulTokens = normalized
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(Boolean)
        .filter((token) => !/^\d+$/.test(token))
        .filter((token) => !filenameNoiseTokens.has(token.toLowerCase()))
        .filter((token) => token.length >= 3);

    if (meaningfulTokens.length === 0) {
        return null;
    }

    const caption = meaningfulTokens.join(' ').trim();

    if (caption.length < 4) {
        return null;
    }

    return caption.charAt(0).toUpperCase() + caption.slice(1);
}

async function analyzePhotoFile(params: {
    storageKey: string;
    filePath: string;
    originalFilename: string;
}): Promise<AnalyzerOutput> {
    let absolutePath: string;

    try {
        absolutePath = resolveAbsolutePath(params.storageKey, params.filePath);
    } catch {
        return {
            caption: buildCaptionFromFilename(params.originalFilename),
            takenAt: extractDateFromFilename(params.originalFilename),
            tags: extractTagsFromFilename(params.originalFilename)
        };
    }

    try {
        await fs.access(absolutePath);
    } catch {
        return {
            caption: buildCaptionFromFilename(params.originalFilename),
            takenAt: extractDateFromFilename(params.originalFilename),
            tags: extractTagsFromFilename(params.originalFilename)
        };
    }

    let exifData: Awaited<ReturnType<typeof exifr.parse>> | null = null;

    try {
        exifData = await exifr.parse(absolutePath);
    } catch {
        exifData = null;
    }

    const exifTakenAt =
        toIsoStringIfValid(exifData?.DateTimeOriginal) ||
        toIsoStringIfValid(exifData?.CreateDate) ||
        toIsoStringIfValid(exifData?.ModifyDate);

    const filenameTakenAt = extractDateFromFilename(params.originalFilename);
    const latitude = isValidCoordinate(exifData?.latitude) ? exifData.latitude : null;
    const longitude = isValidCoordinate(exifData?.longitude) ? exifData.longitude : null;
    const captionFromFilename = buildCaptionFromFilename(params.originalFilename);
    const tagsFromFilename = extractTagsFromFilename(params.originalFilename);

    let country: string | null = null;
    let city: string | null = null;
    let placeName: string | null = null;

    if (latitude != null && longitude != null) {
        try {
            const geocoded = await reverseGeocode(latitude, longitude);
            country = geocoded.country ?? null;
            city = geocoded.city ?? null;
            placeName = geocoded.placeName ?? null;
        } catch {
            country = null;
            city = null;
            placeName = null;
        }
    }

    return {
        caption: captionFromFilename,
        takenAt: exifTakenAt ?? filenameTakenAt,
        latitude,
        longitude,
        country,
        city,
        placeName,
        tags: tagsFromFilename
    };
}

export async function getPhotoSuggestions(userId: string, photoId: string): Promise<PhotoSuggestions> {
    const photo = await prisma.photo.findFirst({
        where: {
            id: photoId,
            userId
        },
        include: {
            tags: {
                include: {
                    tag: true
                }
            }
        }
    });

    if (!photo) {
        throw new Error('Photo not found');
    }

    const analysis = await analyzePhotoFile({
        storageKey: photo.storageKey,
        filePath: photo.filePath,
        originalFilename: photo.originalFilename
    });

    const suggestions: PhotoSuggestions = {};
    const existingTags = new Set(photo.tags.map((item) => normalizeTag(item.tag.name)));

    if (isBlank(photo.caption) && !isBlank(analysis.caption)) {
        suggestions.caption = analysis.caption.trim();
    }

    if (!photo.takenAt && analysis.takenAt) {
        const parsed = new Date(analysis.takenAt);
        if (!Number.isNaN(parsed.getTime())) {
            suggestions.takenAt = parsed.toISOString();
        }
    }

    if (photo.latitude == null && typeof analysis.latitude === 'number') {
        suggestions.latitude = analysis.latitude;
    }

    if (photo.longitude == null && typeof analysis.longitude === 'number') {
        suggestions.longitude = analysis.longitude;
    }

    if (isBlank(photo.country) && !isBlank(analysis.country)) {
        suggestions.country = analysis.country.trim();
    }

    if (isBlank(photo.placeName) && !isBlank(analysis.placeName)) {
        suggestions.placeName = analysis.placeName.trim();
    }

    if (isBlank(photo.city) && !isBlank(analysis.city)) {
        suggestions.city = analysis.city.trim();
    }

    const suggestedTags = Array.isArray(analysis.tags)
        ? analysis.tags
            .map((tag) => tag.trim())
            .filter(Boolean)
            .filter((tag, index, array) => array.findIndex((candidate) => normalizeTag(candidate) === normalizeTag(tag)) === index)
            .filter((tag) => !existingTags.has(normalizeTag(tag)))
        : [];

    if (suggestedTags.length > 0) {
        suggestions.tags = suggestedTags;
    }

    return suggestions;
}