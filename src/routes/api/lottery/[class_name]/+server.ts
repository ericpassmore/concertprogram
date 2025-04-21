import {
    deleteClassLottery,
    getClassLottery,
    updateClassLottery
} from "$lib/server/db";
import {json} from "@sveltejs/kit";
import {createLottery} from "$lib/server/lottery";
import { auth_code } from '$env/static/private';
import { isAuthorized } from '$lib/server/apiAuth';

export async function GET({params}) {
    try {
        const res = await getClassLottery(params.class_name)
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
        const {class_name, lottery} = await request.json();

        if (!class_name || !lottery) {
            return {status: 400, body: {message: 'Missing Field, Try Again'}}
        } else {
            const results = await updateClassLottery(class_name, lottery)
            if (results.rowCount != null && results.rowCount > 0) {
                return json( {id: params.class_name}, {status: 200, body: {message: 'Update successful'}});
            } else {
                return json({id: params.class_name}, {status: 500, body: {message: 'Update failed'}});
            }
        }
    } catch (error) {
        return json({status: 'error', message: 'Failed to process the request'}, {status: 500});
    }
}

export async function POST({params, request, cookies, url}) {
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
        const {class_name, lottery} = await request.json();

        if (await createLottery(class_name, lottery)) {
            return json({id: params.class_name}, {status: 200, body: {message: 'Update successful'}});
        } else {
            return json({id: params.class_name}, {status: 500, body: {message: 'Update failed'}});
        }
    } catch (error) {
        return json({status: 'error', message: 'Failed to process the request'}, {status: 500});
    }
}

export async function DELETE({params, cookies, url, request}) {

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
        await deleteClassLottery(params.class_name)
    } catch (error) {
        return json({status: 'error', message: 'Failed to process the request'}, {status: 500});
    }
}
