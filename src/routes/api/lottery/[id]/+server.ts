import {
    deletePerformerLottery,
    getPerformerLottery,
    updatePerformerLottery
} from "$lib/server/db";
import {json} from "@sveltejs/kit";
import { type LotteryInterface, pafe_series } from '$lib/server/common';
import {createLottery} from "$lib/server/lottery";
import { auth_code } from '$env/static/private';
import { isAuthorized } from '$lib/server/apiAuth';

export async function GET({params, request}) {
    try {
        const res = await getPerformerLottery(params.id)
        if (res.rowCount != 1) {
            return json({status: 'error', message: 'Not Found'}, {status: 404});
        }
        return json(res.rows);
    } catch (error) {
        return json({status: 'error', message: 'Failed to process the request'}, {status: 500});
    }
}
export async function PUT({url, cookies, params, request}) {
    // Check Authorization
    const pafeAuth = cookies.get('pafe_auth')
    const origin = request.headers.get('origin'); // The origin of the request (protocol + host + port)
    const appOrigin = `${url.protocol}//${url.host}`;

    // from local app no checks needed
    if (origin !== appOrigin ) {
        if (!request.headers.has('Authorization')) {
            return json({ result: "error", reason: "Unauthorized" }, { status: 401 })
        }

        if (pafeAuth != auth_code && !isAuthorized(request.headers.get('Authorization'))) {
            return json({ result: "error", reason: "Unauthorized" }, { status: 403 })
        }
    }

    try {
        const {lottery, base34Lottery} = await request.json();
        const ticket: LotteryInterface = {
            lottery: lottery,
            base34Lottery: base34Lottery
        }

        if (!ticket.lottery || !ticket.base34Lottery) {
            return {status: 400, body: {message: 'Missing Field, Try Again'}}
        } else {
            const results = await updatePerformerLottery(params.id, pafe_series(), ticket)
            if (results.rowCount != null && results.rowCount > 0) {
                return json( {id: params.id}, {status: 200, body: {message: 'Update successful'}, headers: access_control_headers});
            } else {
                return json({id: params.id}, {status: 500, body: {message: 'Update failed'}});
            }
        }
    } catch (error) {
        return json({status: 'error', message: 'Failed to process the request'}, {status: 500});
    }
}

export async function POST({params, request}) {
    const access_control_headers =  {
        'Access-Control-Allow-Origin': '*', // Allow all hosts
        'Access-Control-Allow-Methods': 'POST', // Specify allowed methods
    }
    try {
        if (await createLottery(params.id)) {
            return json({id: params.id}, {status: 200, body: {message: 'Update successful'}, headers: access_control_headers});
        } else {
            return json({id: params.id}, {status: 500, body: {message: 'Update failed'}});
        }
    } catch (error) {
        return json({status: 'error', message: 'Failed to process the request'}, {status: 500});
    }
}

export async function DELETE({params, request}) {
    try {
        const results = await deletePerformerLottery(params.id)
    } catch (error) {
        return json({status: 'error', message: 'Failed to process the request'}, {status: 500});
    }
}
