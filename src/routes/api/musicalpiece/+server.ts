import type {MusicalPieceInterface} from "$lib/server/common";
import {insertTable} from "$lib/server/db";
import {json} from "@sveltejs/kit";
import { isAuthorized } from '$lib/server/apiAuth';
import { auth_code } from '$env/static/private';

export async function POST({request, cookies}) {
    // Get the Authorization header
    const pafeAuth = cookies.get('pafe_auth')
    if (pafeAuth != auth_code && !isAuthorized(request.headers.get('Authorization'))) {
        return new Response('Unauthorized', { status: 401 });
    }

    const access_control_headers =  {
        'Access-Control-Allow-Origin': '*', // Allow all hosts
        'Access-Control-Allow-Methods': 'POST', // Specify allowed methods
    }

    try {
        const { printed_name,
            first_composer_id,
            all_movements,
            second_composer_id,
            third_composer_id
        } = await request.json();

        const musicalPiece: MusicalPieceInterface = {
            id: null,
            printed_name: printed_name,
            first_artist_id: first_composer_id,
            all_movements: all_movements,
            second_artist_id: second_composer_id,
            third_artist_id: third_composer_id
        }

        if ( !musicalPiece.printed_name || !musicalPiece.first_artist_id ) {
            return {status: 400, body: {message: 'Missing Field, Try Again'}}
        } else {
            const result = await insertTable('musical_piece', musicalPiece)
            if (result.rowCount != null && result.rowCount > 0) {
                return json({status: 200, body: {message: 'Update successful'}, headers: access_control_headers});
            } else {
                return json({status: 500, body: {message: 'Update failed'}});
            }
        }
    } catch {
        return json({status: 'error', message: 'Failed to process the request'}, {status: 500});
    }
}