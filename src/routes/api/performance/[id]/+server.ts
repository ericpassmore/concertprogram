import { type PerformanceInterface, selectInstrument} from "$lib/server/common";
import {deleteById, queryTable, updatePerformance} from "$lib/server/db";
import {json} from "@sveltejs/kit";
import { isAuthorized } from '$lib/server/apiAuth';

export async function GET({params, request}) {
    try {
        const res = await queryTable('performance',params.id)
        if (res.rowCount != 1) {
            return json({status: 'error', message: 'Not Found'}, {status: 404});
        }
        return json(res.rows);
    } catch (error) {
        return json({status: 'error', message: 'Failed to process the request'}, {status: 500});
    }
}
export async function PUT({params, request}) {
    // Get the Authorization header
    if (!isAuthorized(request.headers.get('Authorization'))) {
        return new Response('Unauthorized', { status: 401 });
    }
    try {
        // the following fields are often not included
        // order, concert_time, warm_up_room_name, warm_up_room_start, warm_up_room_name
        const {
            performer_name,
            musical_piece,
            movements,
            duration,
            accompanist_id,
            concert_series,
            pafe_series,
            instrument,
            order,
            concert_time,
            warm_up_room_name,
            warm_up_room_start,
            warm_up_room_end
        } = await request.json();

        const instrumentEnum = selectInstrument(instrument)
        if (instrumentEnum == null) {
            return json({id: params.id}, {status: 400, body: {message: 'Invalidate Instrument'}});
        }

        let cleaned_pafe_series = pafe_series
        if (cleaned_pafe_series == null) { cleaned_pafe_series = pafe_series() }

        const performance: PerformanceInterface = {
            id: params.id,
            performer_name: performer_name,
            musical_piece: musical_piece,
            movements: movements,
            duration: duration,
            accompanist_id: accompanist_id,
            concert_series: concert_series,
            pafe_series: cleaned_pafe_series,
            instrument: instrumentEnum
        }

        if (!performance.performer_name || !performance.musical_piece || !performance.concert_series) {
            return {status: 400, body: {message: 'Missing Field, Try Again'}}
        } else {
            // get performer id
            const performer_id = 1
            // get musical_peice id
            const musical_piece_id = 0
            const rowCount = await updatePerformance(performance, performer_id, musical_piece_id,
                order, concert_time,
                warm_up_room_name, warm_up_room_start, warm_up_room_end)
            if (rowCount != null && rowCount > 0) {
                return json( {id: params.id}, {status: 200, body: {message: 'Update successful'}});
            } else {
                return json({id: params.id}, {status: 500, body: {message: 'Update failed'}});
            }
        }
    } catch (error) {
        return json({status: 'error', message: 'Failed to process the request'}, {status: 500});
    }
}

export async function DELETE({params, request}){
    // Get the Authorization header
    if (!isAuthorized(request.headers.get('Authorization'))) {
        return new Response('Unauthorized', { status: 401 });
    }
    const rowCount = await deleteById('performance', params.id);

    if (rowCount != null && rowCount > 0) {
        return { status: 200, body: { message: 'Delete successful' } };
    } else {
        return { status: 500, body: { message: 'Delete failed' } };
    }
}