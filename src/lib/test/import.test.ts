import {describe, it, assert, expect} from 'vitest';
import {Performance} from "$lib/server/import";
import {type ImportPerformanceInterface, parseMusicalPiece} from '$lib/server/common';
import {GradeError} from "$lib/server/customExceptions";

describe('Test Import Code', () => {
    it("should parse music titles with movements", async () => {
        const testTitlesWithMovements: readonly [string, string, string, string][] = [
            [
                'J.C.Bach Concerto in C minor 3rd movement by Johann Christian Bach',
                'J.C.Bach Concerto in C minor', '3rd movement', 'Johann Christian Bach'
            ],
            [
                'Pelléas et Mélisande, Op. 80 III. Sicilienne: Allegretto molto moderato by Gabriel Fauré',
                'Pelléas et Mélisande, Op. 80','III. Sicilienne: Allegretto molto moderato','Gabriel Fauré'
            ],
            [
                ' Sonata for Flute, H. 306 I. Allegro moderato by Bohuslav Martinu',
                'Sonata for Flute, H. 306','I. Allegro moderato','Bohuslav Martinu'
            ],
            [
                'Concerto No.4 in D minor, Opus 31, 1st movement by Henri Vieuxtemps',
                'Concerto No.4 in D minor, Opus 31', '1st movement','Henri Vieuxtemps'
            ]
        ]

        const results = testTitlesWithMovements.map(entry => parseMusicalPiece(entry[0]))

        assert.isAbove(results.length, 0, 'Expected results from parsedMusicPieces and found none')
        results.forEach((musicalPiece, index) => {

            assert.equal(musicalPiece.titleWithoutMovement, testTitlesWithMovements[index][1], 'Expected titles to match')

            assert.equal(musicalPiece.movements!, testTitlesWithMovements[index][2], 'Expected movements to match')

            assert.isNotNull(musicalPiece.composers, 'Expected composers to not be null and failed')
            assert.equal(musicalPiece.composers?.[0] ,  testTitlesWithMovements[index][3],'Expected composer to match')
        })
    })
    it("should parse music titles with out movements", async () => {
        const testTitlesWithOutMovements: readonly [string, string, null, string][] = [
            [
                'Bolero by Emile Pessard',
                'Bolero',null,'Emile Pessard'
            ],
            [
                'Prelude & Fugue in B minor by Johann Sebastian Bach',
                'Prelude & Fugue in B minor',null,'Johann Sebastian Bach'
            ],
            [
                'Sonata in F minor, D. 625 by Franz Schubert',
                'Sonata in F minor, D. 625',null,'Franz Schubert'
            ],
            [
                ' Caprice Basque, Opus 24 by Pablo de Sarasate',
                'Caprice Basque, Opus 24',null,'Pablo de Sarasate'
            ],
            [
                ' Piano Sonata No. 3 in F minor, Op. 14 by Robert Schumann',
                'Piano Sonata No. 3 in F minor, Op. 14',null,'Robert Schumann'
            ]
        ]

        const results = testTitlesWithOutMovements.map(entry => parseMusicalPiece(entry[0]))
        assert.isAbove(results.length, 0, 'Expected results from parsedMusicPieces and found none')
        results.forEach(musicalPiece => {
            assert.isNotNull(musicalPiece.composers, 'Expected composers to not be null and failed')
            assert.isNotNull(musicalPiece.composers?.[0], 'Expected composer 1 is not null')
            assert.isAbove(musicalPiece.titleWithoutMovement.length, 5, 'Music title of length 12 or more')
            assert.isNull(musicalPiece.movements, 'Expected no movement')
        })
    })
    it("should insert single performance", async () => {
        const imported: ImportPerformanceInterface = {
            class_name: 'CC.P-4.A',
            performer: 'Nymphodoros Sýkorová',
            email: 'QFnl@example.com',
            phone: '999-555-4444',
            accompanist: 'Zhi, Zhou',
            instrument: 'Cello',
            piece_1: 'J.C.Bach Concerto in C minor 3rd movement by Johann Christian Bach',
            piece_2: null,
            concert_series: 'Eastside'
        }
        const singlePerformance: Performance = new Performance()
        await singlePerformance.initialize(imported)
        await singlePerformance.delete()

        assert.isDefined(singlePerformance.musical_piece_1,'Expected musical piece to be defined')
        assert.isNotNull(singlePerformance.musical_piece_1.id, 'Expected non null musical_piece id')
        assert.isAbove(singlePerformance.musical_piece_1.id, 0, ' Expected musical piece id positive integer')
        assert.equal(singlePerformance.accompanist?.full_name,'Zhou Zhi','Expected accompanist ')
        assert.equal(singlePerformance.performer.full_name,'Nymphodoros Sýkorová','Expected performer name')
        assert.equal(singlePerformance.performer.email,'QFnl@example.com','Expected performer email')
        assert.isDefined(singlePerformance.composer_1,'Expected first composer to be defined')
        assert.equal(singlePerformance.composer_1.full_name,"Johann Christian Bach",'Expected composer')
    });
    it("should fail parsing grade", async () => {
        const imported: ImportPerformanceInterface = {
            class_name: 'XXXX?????',
            performer: 'Nymphodoros Sýkorová',
            email: 'QFnl@example.com',
            phone: '999-555-4444',
            accompanist: 'Zhi, Zhou',
            instrument: 'Cello',
            piece_1: 'J.C.Bach Concerto in C minor 3rd movement by Johann Christian Bach',
            piece_2: null,
            concert_series: 'Eastside'
        }

        const singlePerformance: Performance = new Performance()
        try {
            await singlePerformance.initialize(imported)
        } catch (e) {
            expect(e).to.be.an.instanceof(GradeError)
        }
        await singlePerformance.delete()
    });
});