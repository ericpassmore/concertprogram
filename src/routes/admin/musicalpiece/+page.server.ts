import {error, json, redirect} from "@sveltejs/kit";
import pg from 'pg';
const { QueryArrayResult } = pg;
import {queryTable, deleteById, insertTable} from "$lib/server/db";
import {MusicalPiece, formatFieldNames} from '$lib/server/common.ts'

export async function load({ cookies }) {
    const pafeAuth = cookies.get('pafe_auth')
    if (!pafeAuth) {
        redirect(307, '/');
    }
    const res= await queryTable('musical_piece');
    const columnNames: string[] =  res.fields.map(record => formatFieldNames(record.name));
    return {musicalPieces: res.rows, musical_piece_fields: columnNames};
}

export const actions = {
    delete: async ({ request }) => {
        const formData = await request.formData();
        const id = formData.get('musicalPieceId');
        const rowCount = await deleteById('musical_piece', id);

        if (rowCount != null && rowCount > 0) {
            return { status: 200, body: { message: 'Delete successful' } };
        } else {
            return { status: 500, body: { message: 'Delete failed' } };
        }
    },
    add: async ({request}) => {
        const formData = await request.formData();
        const musicalPiece: MusicalPiece = {
            id: null,
            printed_name: formData.get('printedName'),
            first_composer_id: formData.get('firstComposerId'),
            all_movements: formData.get('allMovements'),
            second_composer_id: formData.get('secondComposerId'),
            third_composer_id: formData.get('thirdComposerId')
        }

        if ( !musicalPiece.printed_name || !musicalPiece.first_composer_id) {
            return {status: 400, body: {message: 'Missing Field, Try Again'}}
        } else {
            const result = await insertTable('musical_piece', musicalPiece)
            if (result.rowCount != null && result.rowCount > 0) {
                return { status: 200, body: { message: 'Insert successful' } };
            } else {
                return { status: 500, body: { message: 'Insert failed' } };
            }
        }
    },
};