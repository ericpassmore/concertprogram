

export function selectInstrument(input: string): string {
    return toTitleCase(input)
}

export function calcEpochAge(age: number): number {
    const currentYear = new Date().getFullYear();
    return currentYear - age;
}

export interface ArtistInterface {
    id: number | null;
    full_name: string;
    role: string;
    years_active: string;
    notes: string;
}

export interface AccompanistInterface {
    id: number | null;
    full_name: string;
}

export interface MusicalPieceInterface {
    id: number | null;
    printed_name: string;
    first_artist_id: number;
    all_movements: string | null;
    second_artist_id: number | null;
    third_artist_id: number | null;
}

export interface PerformerInterface {
    id: number | null;
    full_name: string;
    epoch: number;
    instrument: string;
    email: string | null;
    phone: string | null;
    created?: boolean;
}

export interface PerformanceFilterInterface {
    concert_series: string | null;
    pafe_series: number
}

/**
 * Performance can have multiple music pieces
 * mapping in PerformancePieces
 */
export interface PerformanceInterface {
    id: number | null;
    performer_name: string;
    class: string;
    duration: number | null;
    accompanist_id: number | null;
    concert_series: string;
    pafe_series: number;
    instrument: string;
}

export interface PerformancePieceInterface {
    performance_id: number;
    musical_piece_id: number;
    movement: string | null ;
}

export interface ClassLotteryInterface {
    class_name: string;
    lottery: number;
}

export interface PerformerRankedChoiceInterface {
    performer_id: number;
    concert_series: string;
    pafe_series: number;
    first_choice_time: Date;
    second_choice_time: Date | null;
    third_choice_time: Date | null;
    fourth_choice_time: Date | null;
}

export interface ImportArtistInterface {
    name: string;
    role: string;
    yearsActive: string; // e.g., "1900 - 1980" or "None"
}

export interface ImportMusicalTitleInterface {
    title: string; // e.g., "Symphony No. 5 in C Minor"
    artists: ImportArtistInterface[];
}

export interface ImportPerformanceInterface {
    class_name: string;
    performer: string;
    lottery: number;
    age: number;
    instrument: string;
    concert_series: string | null;
    musical_piece: ImportMusicalTitleInterface[];
    email: string | null;
    phone: string | null;
    accompanist: string | null;
}

export interface PerformerSearchResultsInterface {
    status: 'OK'|'ERROR'|'NOTFOUND';
    performer_id: number;
    performer_name: string;
    musical_piece: string;
    lottery_code: number;
    concert_series: string;
}

export interface EastSideFormInterface {
    rank: number | null;
    notSelected: boolean;
}

export interface ConcertoFormInterface {
    confirmed: boolean;
}

export type ScheduleFormInterface = EastSideFormInterface | ConcertoFormInterface

export function formatFieldNames(input: string): string {
    return input
        .split('_') // Split the string by underscores
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize the first letter of each word
        .join(' '); // Join the words with spaces
}

export function isNonEmptyString(value: any): boolean {
    return typeof value === 'string' && value.trim().length > 0;
}

export function pafe_series(): number {
    const currentYear = new Date().getFullYear();
    return currentYear - 1988;
}

export function displayReformatISODate(isoDate: string): string {
    const date = new Date(isoDate);

    // Format the date
    return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        hour12: true // Use 12-hour format
    });
}

export function compareReformatISODate(isoDate: string): string {
    const date = new Date(isoDate);

    // Format the date with leading zeros for day and month
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    // Format time part (HH:mm:ss)
    const timePart = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false // Use 24-hour time format
    });

    // Combine date and time parts
    return `${month}/${day}/${year}T${timePart}`;
}

// Initialize base 34 chars.
// All Zeros are 'O'
// ALL Ones are 'I'
const BASE34_CHARACTERS = 'O23456789ABCDEFGHIJKLMNPQRSTUVWXYZ';
const CHAR_TO_VALUE: { [key: string]: number } = {};

for (let i = 0; i < BASE34_CHARACTERS.length; i++) {
    CHAR_TO_VALUE[BASE34_CHARACTERS[i]] = i;
}
export function decimalToBase34(num: number): string {
    if (num === 0) return 'O';
    let base34 = '';
    while (num > 0) {
        const remainder = num % 34;
        base34 = BASE34_CHARACTERS[remainder] + base34;
        num = Math.floor(num / 34);
    }
    if (base34.length == 3) {
        base34 = 'O' + base34;
    }
    return base34;
}

export function base34ToDecimal(base34: string): number {
    let num = 0;
    for (let i = 0; i < base34.length; i++) {
        num = num * 34 + CHAR_TO_VALUE[base34[i]];
    }
    return num;
}

export function parseMusicalPiece(piece_performed: string): {
    titleWithoutMovement: string;
    movements: string | null;
} {

    // Second extract the movement from the remaining string
    const movementPattern = /(.*?)(\b(?:\d+(?:st|nd|rd|th)?\s*[Mm]ovements*|I{1,3}\.\s*[^,]+))$/i;

    const match = piece_performed.match(movementPattern);
    if (match) {
        // trim and remove leading and trailing spaces and commas
        return {
            titleWithoutMovement: match[1].replace(/^[ ,]+|[ ,]+$/g, ""),
            movements: match[2] ? match[2].replace(/^[ ,]+|[ ,]+$/g, "") : null
        }
    }
    // If no match is found, return the title without modifications
    return {
        titleWithoutMovement: piece_performed,
        movements: null
    };
}

export async function unpackBody(stream: ReadableStream<Uint8Array>): Promise<string> {
    const reader = stream.getReader();
    const decoder = new TextDecoder(); // Initialize a TextDecoder for UTF-8 by default
    let result = '';

    while (reader != undefined) {
        const { done, value } = await reader.read(); // Read the stream chunk by chunk
        if (done) break; // Exit the loop if there are no more chunks
        result += decoder.decode(value, { stream: true }); // Decode and append the chunk
    }
    return result
}

export function toTitleCase(str: string): string {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
}

