import {MusicalPiece} from "$lib/server/common";
import {deleteById, queryTable, updateById} from "$lib/server/db";
import {json} from "@sveltejs/kit";

export async function GET({params, request}) {
    try {
        const res = await queryTable('musical_piece',params.id)
        if (res.rowCount != 1) {
            return json({status: 'error', message: 'Not Found'}, {status: 404});
        }
        return json(res.rows);
    } catch (error) {
        return json({status: 'error', message: 'Failed to process the request'}, {status: 500});
    }
}
export async function PUT({params, request}) {
    try {
        const {printed_name,
            first_composer_id,
            all_movements,
            second_composer_id,
            third_composer_id
        } = await request.json();
        const musicalPiece: MusicalPiece = {
            id: params.id,
            printed_name: printed_name,
            first_composer_id: first_composer_id,
            all_movements: all_movements,
            second_composer_id: second_composer_id,
            third_composer_id: third_composer_id
        }

        if (!musicalPiece.printed_name || !musicalPiece.first_composer_id) {
            return {status: 400, body: {message: 'Missing Field, Try Again'}}
        } else {
            const rowCount = await updateById('musical_piece', musicalPiece)
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
    const rowCount = await deleteById('musical_piece', params.id);

    if (rowCount != null && rowCount > 0) {
        return { status: 200, body: { message: 'Delete successful' } };
    } else {
        return { status: 500, body: { message: 'Delete failed' } };
    }
}