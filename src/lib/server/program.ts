import { retrievePerformanceByLottery } from '$lib/server/db';
import {getCachedTimeStamps} from '$lib/cache'
import { compareReformatISODate } from '$lib/server/common';

export interface ComposerInterface {
	printedName: string;
	yearsActive: string
}
export interface MusicalTitleInterface {
	title: string;
	movement: string;
	composers: ComposerInterface[];
}
export interface PerformanceInterface {
	id: number;
	performerId: number;
	performerName: string;
	instrument: string;
	grade: string;
	accompanist: string;
	musicalTitles: MusicalTitleInterface[];
}

export interface OrderedPerformanceInterface extends PerformanceInterface {
	lottery: string;
	concertSeries: string;
	concertNumberInSeries: number;
	order: number;
}

export interface ConcertDetailInterface {
	[key: string]: number;
}

class ConcertCount {
	orderMap: ConcertDetailInterface = {}

	createKey = (str: string, num: number): string => `${str.toLowerCase()}-${num}`;

	init(concertSeries: string, concertNumberInSeries: number) {
		this.set(concertSeries,concertNumberInSeries,1)
	}
	increment(concertSeries: string, concertNumberInSeries: number) {
		this.set(
			concertSeries,
			concertNumberInSeries,
			this.get(concertSeries,concertNumberInSeries)+1
		)
	}
	set(concertSeries: string, concertNumberInSeries: number, count: number) {
		this.orderMap[this.createKey(concertSeries,concertNumberInSeries)] = count;
	}
	get(concertSeries: string, concertNumberInSeries: number): number {
		return this.orderMap[this.createKey(concertSeries,concertNumberInSeries)]
	}
	exists(concertSeries: string, concertNumberInSeries: number): boolean {
		return this.orderMap[this.createKey(concertSeries, concertNumberInSeries)] != null &&
			this.orderMap[this.createKey(concertSeries, concertNumberInSeries)] >= 0;
	}
}

export class Program {
	pafeSeries: number;
	eastSideSeats: number;
	orderedPerformance: OrderedPerformanceInterface[] = []
	count: ConcertCount = new ConcertCount()
	concertTimeStamps: any[] = []

	constructor(pafe_series: number, eastsideSeats: number = 10) {
		this.pafeSeries = pafe_series;
		this.eastSideSeats = eastsideSeats;
	}

	async build() {
		try {
			// set the timestamps needed to map ranked choice concert times to concert number in series
			await this.setConcertTimeStamps()
			// fetch performances order by concert_series & lottery
			//  - performer id, lottery num, concert_series, array of concert times
			//  - filter by pafe_series
			//  - concerto concerts show up first and takes precedent
			const performancesWithLottery =  await retrievePerformanceByLottery(this.pafeSeries);
			if (performancesWithLottery.rowCount != null && performancesWithLottery.rowCount > 0) {

				// iterate over the list in order, add the performances
				//  - track seat limit per EastSide concert (#1,#2,#3,#4), and stop adding when limit reached
				//  - choncertChairChoice overrides and ignores any limits
				for (const performance of performancesWithLottery.rows) {
					// first thing create an array of concerts in order of ranked choice
					const rankedChoiceConcerts: number[] = this.computeRankedChoices(
						[performance.first_choice_time,
						performance.second_choice_time,
						performance.third_choice_time,
						performance.fourth_choice_time]
					)

					let hasPlacement = false
					let numberInSeries = 1
					for (const concertNum of rankedChoiceConcerts) {
						// Not Full Set to This Concert
						if (!this.isFull(performance.concert_series, concertNum, performance.concert_chair_choice)) {
							this.incrementConcertCount(performance.concert_series, concertNum)
							numberInSeries = concertNum
							hasPlacement = true
							break;
						}
						// Last Concert Was Full Move to Next
					}

					// build musical title
					const composers: ComposerInterface = {printedName: "Back", yearsActive: "0-1"}
					const musicalTitles: MusicalTitleInterface =
						{title:"All Is Good", movement: "I. Fast", composers: [composers]};

					// add performance
					this.orderedPerformance.push({
						id: performance.id,
						performerId: performance.performer_id,
						performerName: "full name",
						instrument: "Cello",
						grade: "3-5",
						accompanist: "any body",
						lottery: performance.lottery,
						// put Remaining performers, whose desired schedule can not be met  into "Waitlist" concert series
						concertSeries: hasPlacement ? performance.concert_series: "Waitlist",
						concertNumberInSeries: numberInSeries,
						order: performance.performance_order,
						musicalTitles: [musicalTitles]
					});

				}
			}
		} catch (error) {
			throw new Error(`Failed to build program ${(error as Error).message}`)
		}
	}

	// when retrieving sort by Concert Series, Concert Number in Series, and Performance Order
	//   - late arrivals get default order of 100, and likely will fall to bottom
	retrieveAllConcertPrograms(): OrderedPerformanceInterface[] {
		return this.orderedPerformance
			.sort((a, b) => {
			if (a.concertSeries !== b.concertSeries) {
				return a.concertSeries.localeCompare(b.concertSeries);
			}
			if (a.concertNumberInSeries !== b.concertNumberInSeries) {
				return a.concertNumberInSeries - b.concertNumberInSeries;
			}
			return a.order - b.order;
		});
	}

	incrementConcertCount(concertSeries:string, numberInSeries: number): void {
		// switch to EastSide form Concerto
		if (this.count.exists(concertSeries,numberInSeries)) {
			this.count.increment(concertSeries,numberInSeries)
		} else {
			this.count.init(concertSeries,numberInSeries)
		}
	}

	async setConcertTimeStamps() {
		// init once, no need to reinit
		if (this.concertTimeStamps == null || this.concertTimeStamps.length <= 0) {
			this.concertTimeStamps = await getCachedTimeStamps()
		}
	}

	// remove nulls
	// then find caches concert time stamp entry with matching timestamp
	// return concert_number_in_series from matching record and convert to Number
	computeRankedChoices(choiceTimes: (string | null)[]): number[] {
		return choiceTimes
			.filter(mapped => mapped !== null)
			.map(item =>
				Number(this.concertTimeStamps.data
					.find(concert => concert.normalizedStartTime === compareReformatISODate(item))?.concert_number_in_series)
			)
	}

	isFull(concertSeries: string, concertNum: number, chairOverride: boolean): boolean {
		if (chairOverride) { return false }
		return concertSeries.toLowerCase() === "eastside" &&
			this.count.get(concertSeries, concertNum) >= this.eastSideSeats;
	}
}