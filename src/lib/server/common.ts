
export enum Instrument {
    Cello = 'Cello',
    Flute = 'Flute',
    Piano = 'Piano',
    Violin = 'Violin',
    Soprano = 'Soprano',
    Viola = 'Viola',
    Tenor = 'Tenor',
    Clarinet = 'Clarinet',
    Oboe = 'Oboe',
    Bassoon = 'Bassoon',
    Ensemble = 'Ensemble'
}
export function selectInstrument(input: string): Instrument | null {
    input = input.toLowerCase()
    let returnInstrument: Instrument | null = null
    switch(input) {
        case 'cello':
            returnInstrument = Instrument.Cello
            break
        case 'flute':
            returnInstrument = Instrument.Flute
            break
        case 'piano':
            returnInstrument = Instrument.Piano
            break
        case 'violin':
            returnInstrument = Instrument.Violin
            break
        case 'viola':
            returnInstrument = Instrument.Viola
            break
        case 'soprano':
            returnInstrument = Instrument.Soprano
            break
        case 'tenor':
            returnInstrument = Instrument.Tenor
            break
        case 'oboe':
            returnInstrument = Instrument.Oboe
            break
        case 'clarinet':
            returnInstrument = Instrument.Clarinet
            break
        case 'bassoon':
            returnInstrument = Instrument.Bassoon
            break
        case 'Ensemble':
            returnInstrument = Instrument.Ensemble
            break
        default:
            returnInstrument = null
            break
    }
    return returnInstrument;
}

export enum Grade {
    'GradePreto2'='Preschool - 2nd',
    'GradePreto4'='Preschool - 4th',
    'GradePreto6'='Preschool - 6th',
    'GradePreto8'='Preschool - 8th',
    'Grade3to4'='3rd - 4th',
    'Grade3to5'='3rd - 5th',
    'Grade3to8'='3rd - 8th',
    'Grade5to6'='5th - 6th',
    'Grade5to8'='5th - 8th',
    'Grade6to8'='6th - 8th',
    'Grade7to8'='7th - 8th',
    'Grade9to10'='9th - 10th',
    'Grade9to12'='9th - 12th',
    'Grade11to12'='11th - 12th'
}

export function selectGrade(input: string): Grade | null {
    input = input.toLowerCase()
    let returnGrade: Grade | null = null

    switch(input) {
        case 'P-2':
            returnGrade = Grade.GradePreto2
            break
        case 'P-4':
            returnGrade = Grade.GradePreto4
            break
        case 'P-6':
            returnGrade = Grade.GradePreto6
            break
        case 'P-8':
            returnGrade = Grade.GradePreto8
            break
        case '3-4':
            returnGrade = Grade.Grade3to4
            break
        case '3-5':
            returnGrade = Grade.Grade3to5
            break
        case '3-8':
            returnGrade = Grade.Grade3to8
            break
        case '5-6':
            returnGrade = Grade.Grade5to6
            break
        case '5-8':
            returnGrade = Grade.Grade5to8
            break
        case '6-8':
            returnGrade = Grade.Grade6to8
            break
        case '7-8':
            returnGrade = Grade.Grade7to8
            break
        case '9-10':
            returnGrade = Grade.Grade9to10
            break
        case '9-12':
            returnGrade = Grade.Grade9to12
            break
        case '11-12':
            returnGrade = Grade.Grade11to12
            break
    }

    return returnGrade
}

export interface Composer {
    id: number | null;
    printed_name: string;
    full_name: string;
    years_active: string;
    alias: string;
}

export interface Accompanist {
    id: number | null;
    full_name: string;
}

export interface MusicalPiece {
    id: number | null;
    printed_name: string;
    first_composer_id: number;
    all_movements: string | null;
    second_composer_id: number | null;
    third_composer_id: number | null;
}

export interface Performer {
    id: number | null;
    full_name: string;
    grade: Grade;
    instrument: Instrument;
    email: string | null;
    phone: string | null;
}

export interface PerformanceFilter {
    concert_series: string | null;
    pafe_series: number
}

/**
 * Performance can have multiple music pieces
 * Not represented in this data structure
 * Would simply call Performance insert multiple times with performance id
 */
export interface Performance {
    id: number | null;
    performer_name: string;
    musical_piece: string;
    movements: string;
    duration: number | null;
    accompanist_id: number | null;
    concert_series: string;
    pafe_series: number;
    instrument: Instrument;
}

export interface Lottery {
    lottery: number;
    base34Lottery: string;
}

export interface PerformerRankedChoice {
    performer_id: number;
    concert_series: string;
    pafe_series: number;
    first_choice_time: Date;
    second_choice_time: Date | null;
    third_choice_time: Date | null;
    fourth_choice_time: Date | null;
}

export function formatFieldNames(input: string): string {
    return input
        .split('_') // Split the string by underscores
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize the first letter of each word
        .join(' '); // Join the words with spaces
}

export function isNonEmptyString(value: any): boolean {
    return typeof value === 'string' && value.trim().length > 0;
}

export function generateLottery(): Lottery {
    // Lottery Number at most 4 digit base 34
    const min = 1;
    const max = 1337334;

    // 0.3% chance of collision for 100 random numbers
    const lottery = Math.floor(Math.random() * (max - min + 1)) + min;
    // convert to base 36 string
    const base34Lottery = decimalToBase34(lottery);

    return {lottery, base34Lottery};
}

export function pafe_series(): number {
    const currentYear = new Date().getFullYear();
    return currentYear - 1988;
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
    return base34;
}

export function base34ToDecimal(base34: string): number {
    let num = 0;
    for (let i = 0; i < base34.length; i++) {
        num = num * 34 + CHAR_TO_VALUE[base34[i]];
    }
    return num;
}


