import pg from 'pg';
const { QueryArrayResult } = pg;
import {queryTable, deleteById, insertTable} from "$lib/server/db";
import { type ArtistInterface, formatFieldNames } from '$lib/server/common';

export async function load({ cookies }) {
    const pafeAuth = cookies.get('pafe_auth')
    const isAuthenticated =  !!pafeAuth;

    const res= await queryTable('artist');
    const columnNames: string[] =  res.fields.map(record => formatFieldNames(record.name));
    return {artists: res.rows, artists_fields: columnNames, isAuthenticated: isAuthenticated};
}

export const actions = {
    delete: async ({ request }) => {
        const formData = await request.formData();
        const id = formData.get('artistId') ? parseInt(formData.get('artistId') as string, 10) : -1;
        const rowCount = await deleteById('artist', id);

        if (rowCount != null && rowCount > 0) {
            return { status: 200, body: { message: 'Delete successful' } };
        } else {
            return { status: 500, body: { message: 'Delete failed' } };
        }
    },
    add: async ({request}) => {
        const formData = await request.formData();
        const artist: ArtistInterface = {
            id: null,
            full_name: formData.get('fullName') as string,
            role: formData.get('role') as string,
            years_active: formData.get('yearsActive') as string,
            notes: formData.get('notes') as string
        }

        if ( !artist.full_name || !artist.years_active) {
            return {status: 400, body: {message: 'Missing Field, Try Again'}}
        } else {
            const result = await insertTable('artist', artist)
            if (result.rowCount != null && result.rowCount > 0) {
                return { status: 200, body: { message: 'Insert successful' } };
            } else {
                return { status: 500, body: { message: 'Insert failed' } };
            }
        }
    },
};