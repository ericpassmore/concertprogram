import {DataParser, Performance} from "$lib/server/import";
import type {
    ImportArtistInterface,
    ImportMusicalTitleInterface,
    ImportPerformanceInterface
} from '$lib/server/common';
import { fail } from '@sveltejs/kit';

export async function load({ cookies }) {
    const pafeAuth = cookies.get('pafe_auth')
    const isAuthenticated =  !!pafeAuth;

    return {isAuthenticated: isAuthenticated}
}

export const actions = {
    add: async ({request}) => {
        const formData = await request.formData();
        if (formData.has('bigtext')) {
            const csvData = formData.get('bigtext')
            const concertSeries = formData.get('concert-series')
            const importedData = new DataParser()
            if ( csvData != null && concertSeries != null ) {
                await importedData.initialize(csvData.toString(), "CSV", concertSeries.toString())
                if (importedData.failedImports.length > 0) {
                    return fail(500, { error: JSON.stringify(importedData.failedImports) });
                }
            }
        } else {
            const composerPieceOne: ImportArtistInterface = {
                name: formData.get('composer-name-piece-1'),
                years_active: formData.get('composer-years-piece-1'),
                notes: 'API-import'
            }

            const importMusicalTitle: ImportMusicalTitleInterface[] = [];
            if (formData.has('musical-piece-1')) {
                importMusicalTitle.push({
                    title: formData.get('musical-piece-1'),
                    artists: [composerPieceOne]
                })
            }

            let composerPieceTwo: ImportArtistInterface
            if ( formData.has('musical-piece-2')
              && formData.has('composer-name-piece-2')
              && formData.has('composer-years-piece-2')
            ) {
                composerPieceTwo = {
                    name: formData.get('composer-name-piece-2'),
                    years_active: formData.get('composer-years-piece-2'),
                    notes: 'API-import'
                }
                importMusicalTitle.push({
                    title: formData.get('musical-piece-2'),
                    artists: [composerPieceTwo]
                })
            }


            const imported: ImportPerformanceInterface = {
                class_name: formData.get('class'),
                performer: formData.get('performer-name'),
                age: formData.get('age'),
                lottery: formData.get('lottery'),
                instrument: formData.get('instrument'),
                concert_series: formData.get('concert-series'),
                musical_piece: importMusicalTitle,
                ...(formData.get('accompanist') != null && formData.get('accompanist') !== ''
                  ? { accompanist: formData.get('accompanist') }
                  : { accompanist: null}),
                ...(formData.get('performer-email') != null && formData.get('performer-email') !== ''
                  ? { email: formData.get('performer-email') }
                  : { email: null } ),
                ...(formData.get('performer-phone') != null && formData.get('performer-phone') !== ''
                  ? { phone: formData.get('performer-phone') }
                  : { phone: null})
            }

            const singlePerformance: Performance = new Performance()
            try {
                await singlePerformance.initialize(imported)
            } catch (e) {
                return fail(500, { error: (e as Error).message });
            }
        }
    },
};
