import pkg from 'pg';
const {Pool} = pkg;
import {db_user, db_pass, db_name, db_host, db_port, db_ssl} from '$env/static/private';
import {
    type AccompanistInterface,
    type ArtistInterface,
    type MusicalPieceInterface,
    type PerformerInterface,
    type PerformanceInterface,
    type PerformanceFilterInterface,
    type PerformancePieceInterface,
    type PerformerSearchResultsInterface, pafe_series, calcEpochAge
} from '$lib/server/common';
import {isNonEmptyString} from "$lib/server/common";

const pool = new Pool({
    user: db_user,
    host: db_host,
    database: db_name,
    password: db_pass,
    port: db_port,
    ssl: db_ssl==="true" ? { rejectUnauthorized: false } : undefined,
});

export async function queryTable(table: string, id?: number) {
    try {
			const connection = await pool.connect();

			let fields = '';
			let filter = '';
			let sort = '';

			switch (table) {
				case 'composer':
					fields = 'id, full_name, years_active, notes';
					break;
				case 'accompanist':
					fields = 'id, full_name';
					break;
				case 'performer':
					fields = 'id, full_name, email, phone, epoch, instrument';
					break;
				case 'musical_piece':
					fields =
						'id, printed_name, first_composer_id, all_movements, second_composer_id, third_composer_id';
					break;
				case 'concert_times':
					fields = 'concert_series, pafe_series,concert_number_in_series,start_time';
					break;
				case 'class_lottery':
					fields = 'class_name, lottery';
					break;
			}
			if (id != null) {
				filter = ' WHERE id=' + id;
			} else {
				sort = ' ORDER BY id';
			}

			// tables with no id field
			switch (table) {
				case 'concert_times':
					sort = '';
          break;
				case 'class_lottery':
					sort = '';
					break;
			}

			const result = connection.query('SELECT ' + fields + ' FROM ' + table + filter + sort);

			// Release the connection back to the pool
			connection.release();

			return result;
		} catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}

export async function lookupByDetails(performerLastName: string, age: number, composer: string): Promise<PerformerSearchResultsInterface | null> {

    const birthYear = calcEpochAge(age)

    try {
        const connection = await pool.connect();
        // order by Concerto comes first followed by EastSide
        // if you are in the concerto playoff can't also perform in EastSide artists concert
        const searchQuery = "SELECT performer.id, performer.full_name as performer_name, \n" +
            "class_lottery.lottery as lottery_code, \n"+
            "musical_piece.printed_name as musical_piece,  performance.concert_series \n" +
            "FROM performer \n"+
            "JOIN performance ON performance.performer_id = performer.id \n" +
            "JOIN class_lottery ON performance.class_name = class_lottery.class_name \n" +
            "JOIN performance_pieces ON performance_pieces.performance_id = performance.id \n" +
            "JOIN musical_piece ON musical_piece.id = performance_pieces.musical_piece_id \n" +
            "JOIN composer ON musical_piece.first_composer_id = composer.id \n" +
            "WHERE performer.full_name like '%"+performerLastName+"' \n" +
            "  AND (LOWER(composer.full_name) LIKE '%"+composer.toLowerCase()+"' OR LOWER(composer.notes) = '"+composer.toLowerCase()+"') \n" +
            "  AND performer.epoch = "+birthYear+" \n" +
            "  AND performance.pafe_series =" + pafe_series() + " \n" +
            "  ORDER BY performance.concert_series ASC";

        const dbResult = await connection.query(searchQuery);
        connection.release()

        if (dbResult.rowCount != null && dbResult.rowCount > 0) {
            return  {
                "status": "OK",
                "performer_id": dbResult.rows[0].id,
                "performer_name": dbResult.rows[0].performer_name,
                "musical_piece": dbResult.rows[0].musical_piece,
                "lottery_code": dbResult.rows[0].lottery_code,
                "concert_series": dbResult.rows[0].concert_series
            }
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}

export async function lookupByCode(code: string): Promise<PerformerSearchResultsInterface | null> {

    try {
        const connection = await pool.connect();
        // order by Concerto comes first followed by EastSide
        // if you are in the concerto playoff can't also perform in EastSide artists concert
        const searchQuery = "SELECT performer.id, performer.full_name as performer_name, \n" +
            "class_lottery.lottery as lottery_code, \n"+
            "musical_piece.printed_name as musical_piece,  performance.concert_series \n" +
            "FROM performer \n"+
            "JOIN performance ON performance.performer_id = performer.id \n" +
            "JOIN class_lottery on performance.class_name = class_lottery.class_name \n" +
            "JOIN performance_pieces ON performance_pieces.performance_id = performance.id \n" +
            "JOIN musical_piece ON musical_piece.id = performance_pieces.musical_piece_id \n" +
            "WHERE class_lottery.lottery = "+code+" \n" +
            "  AND performance.pafe_series =" + pafe_series() + " \n" +
            "  ORDER BY performance.concert_series ASC";

        const dbResult = await connection.query(searchQuery);
        connection.release()

        if (dbResult.rowCount != null && dbResult.rowCount > 0) {
            return  {
                "status": "OK",
                "performer_id": dbResult.rows[0].id,
                "performer_name": dbResult.rows[0].performer_name,
                "musical_piece": dbResult.rows[0].musical_piece,
                "lottery_code": dbResult.rows[0].lottery_code,
                "concert_series": dbResult.rows[0].concert_series
            }
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}

export async function deleteById(table: string, id: number): Promise<number | null> {
    try {
        const connection = await pool.connect();

        const result = await connection.query("DELETE FROM "+table+" WHERE id = "+id)

        // Release the connection back to the pool
        connection.release();

        return result.rowCount;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}

export async function insertTable(table: string, data: ArtistInterface | AccompanistInterface | MusicalPieceInterface | PerformerInterface){
    try {
        const connection = await pool.connect();

        let inputCols = "";
        let inputVals = "";
        const return_id = true;

        switch (table) {
            case 'artist':
                inputCols = "(full_name, role, years_active)"
                inputVals = "( "
                  +"'"+(data as ArtistInterface).full_name.replaceAll("'","''").trim()+"', "
                  +"'"+(data as ArtistInterface).role.replaceAll("'","''").trim()+"', "
                  +"'"+(data as ArtistInterface).years_active+"')"
                // add notes
                if (isNonEmptyString((data as ArtistInterface).notes)) {
                    inputCols = inputCols.slice(0, -1) + ", notes)"
                    inputVals = inputVals.slice(0, -1) +", '"+(data as ArtistInterface).notes.replaceAll("'","''").trim()+"')"
                }
                // return id
                break;
            case 'accompanist':
                inputCols = "(full_name)"
                inputVals = "('"+(data as AccompanistInterface).full_name.replaceAll("'","''").trim()+"')"
                // return id
                break;
            case 'performer':
                inputCols = "(full_name, epoch, instrument)"
                inputVals = "('"+
                  (data as PerformerInterface).full_name.replaceAll("'","''").trim()+"', "+
                  (data as PerformerInterface).epoch+", '"+
                  (data as PerformerInterface).instrument+
                    "')"
                // add email
                if ((data as PerformerInterface).email != null && isNonEmptyString((data as PerformerInterface).email)) {
                    inputCols = inputCols.slice(0, -1) + ", email)"
                    inputVals = inputVals.slice(0, -1) +", '"+(data as PerformerInterface).email.replaceAll("'","''").trim()+"')"
                }
                // add phone
                if ((data as PerformerInterface).phone != null && isNonEmptyString((data as PerformerInterface).phone)) {
                    inputCols = inputCols.slice(0, -1) + ", phone)"
                    inputVals = inputVals.slice(0, -1) +", '"+(data as PerformerInterface).phone.replaceAll("'","''").trim()+"')"
                }
                // return id
                break;
            case 'musical_piece':
                inputCols = "(printed_name, first_composer_id)"
                inputVals = "('"+(data as MusicalPieceInterface).printed_name.replaceAll("'","''").trim()+"', '"+
                  (data as MusicalPieceInterface).first_artist_id+"')"
                // add movements
                if ((data as MusicalPieceInterface).all_movements != null && ((data as MusicalPieceInterface).all_movements)) {
                    inputCols = inputCols.slice(0, -1) + ", all_movements)"
                    inputVals = inputVals.slice(0, -1) +", '"+(data as MusicalPieceInterface).all_movements.replaceAll("'","''").trim()+"')"
                }
                // add another composer
                if (isNonEmptyString((data as MusicalPieceInterface).second_artist_id)) {
                    inputCols = inputCols.slice(0, -1) + ", second_composer_id)"
                    inputVals = inputVals.slice(0, -1) +", '"+(data as MusicalPieceInterface).second_artist_id+"')"
                }
                if (isNonEmptyString((data as MusicalPieceInterface).third_artist_id)) {
                    inputCols = inputCols.slice(0, -1) + ", third_composer_id)"
                    inputVals = inputVals.slice(0, -1) +", '"+(data as MusicalPieceInterface).third_artist_id+"')"
                }
                //return id
                break;
        }

        let insertSQL="INSERT INTO "+table+" "+inputCols+" VALUES "+inputVals
        if (return_id) {
            insertSQL = insertSQL + " RETURNING id"
        }

        const result = await connection.query(insertSQL)

        // Release the connection back to the pool
        connection.release();

        return result
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}

export async function insertPerformance(data: PerformanceInterface,
                                        performer_id: number,
                                        order: number | null,
                                        comment: string | null,
                                        warm_up_room_name: string | null,
                                        warm_up_room_start: Date | null,
                                        warm_up_room_end: Date | null) {
    try {
        const connection = await pool.connect()

        let cols = "performer_id, concert_series, class_name, pafe_series, instrument"
        let vals = performer_id+", '"+data.concert_series+"', '"+data.class+"', "+data.pafe_series+", '"+data.instrument+"'"

        if (order != null) {
            cols = cols +", order"
            vals = vals +", "+order
        }
        if (data.duration != null) {
            cols = cols +", duration"
            vals = vals +", "+ data.duration
        }
        if (data.accompanist_id != null) {
            cols = cols +", accompanist_id"
            vals = vals +", "+data.accompanist_id
        }
        if (comment != null && comment != "") {
            cols = cols +", comment"
            vals = vals +", '"+comment+"'"
        }
        if (warm_up_room_name != null) {
            cols = cols +", warm_up_room_name"
            vals = vals +", '"+warm_up_room_name+"'"
        }
        if (warm_up_room_start != null) {
            cols = cols +", warm_up_room_start"
            vals = vals +", '"+warm_up_room_start.toTimeString()+"'"
        }
        if (warm_up_room_end != null ) {
            cols = cols +", warm_up_room_end"
            vals = vals +", '"+warm_up_room_end.toTimeString()+"'"
        }

        cols = "("+cols+")"
        vals = "("+vals+")"

        const insertSQL= "INSERT INTO PERFORMANCE " + cols + " VALUES " + vals + "RETURNING id";
        const result = await connection.query(insertSQL)

        // Release the connection back to the pool
        connection.release();
        return result
    } catch (error) {
        console.error('Error executing insertPerformance:', error);
        throw error;
    }
}

export async function updatePerformance(data: PerformanceInterface,
                                        performer_id: number,
                                        order: number | null,
                                        comment: string | null,
                                        warm_up_room_name: string | null,
                                        warm_up_room_start: Date | null,
                                        warm_up_room_end: Date | null) {
    try {
        const connection = await pool.connect()

        let setCols = "performer_id = "+performer_id+
            ", concert_series = '"+data.concert_series+
            ", class_name = '"+data.class+
            ", pafe_series = "+data.pafe_series+
            ", instrument = '"+data.instrument

        if (order != null) {
            setCols = setCols + ", order = "+order
        }
        if (data.duration != null) {
            setCols = setCols + ", duration = "+data.duration
        }
        if (data.accompanist_id != null) {
            setCols = setCols + ", accompanist_id = "+data.accompanist_id
        }
        if (comment != null && comment != "") {
            setCols = setCols  +", comment = '"+comment+"'"
        }
        if (warm_up_room_name != null) {
            setCols = setCols + ", warm_up_room_name = '"+warm_up_room_name+"'"
        }
        if (warm_up_room_start != null) {
            setCols = setCols + ", warm_up_room_start = '"+warm_up_room_start.toTimeString()+"'"
        }
        if (warm_up_room_end != null ) {
            setCols = setCols + ", warm_up_room_end = '"+warm_up_room_end.toTimeString()+"'"
        }

        const updateSQL= "UPDATE PERFORMANCE SET "+setCols+" WHERE performance.id = "+data.id;
        const result = await connection.query(updateSQL)

        // Release the connection back to the pool
        connection.release();

        return result

    } catch (error) {
        console.error('Error executing insertPerformance:', error);
        throw error;
    }
}

export async function updateById(table: string, data: ArtistInterface | AccompanistInterface | MusicalPieceInterface | PerformerInterface ){
    try {
        const connection = await pool.connect();

        let setCols = "";

        switch (table) {
            case 'composer':
                // don't wipe out data
                if (! (isNonEmptyString((data as ArtistInterface).full_name) &&
                    isNonEmptyString((data as ArtistInterface).years_active))
                ) {
                    return null
                }
                setCols = setCols + " full_name = '"+(data as ArtistInterface).full_name+"'"
                setCols = setCols + ", years_active = '"+(data as ArtistInterface).years_active+"'"
                if (isNonEmptyString((data as ArtistInterface).notes)) {
                    setCols = setCols + ", notes = '" + (data as ArtistInterface).notes + "' "
                }
                break;
            case 'accompanist':
                // don't wipe out data
                if (!isNonEmptyString((data as AccompanistInterface).full_name)) {
                    return null
                }
                setCols = "full_name = '"+(data as AccompanistInterface).full_name+"'"
                break;
            case 'performer':
                // don't wipe out data
                if (! (isNonEmptyString((data as PerformerInterface).full_name) &&
                    isNonEmptyString((data as PerformerInterface).instrument) &&
                   (data as PerformerInterface).epoch != null )
                ) {
                    return null
                }
                setCols = "full_name = '"+(data as PerformerInterface).full_name+"'"
                setCols = setCols + ", instrument = '"+(data as PerformerInterface).instrument+"'"
                setCols = setCols + ", epoch = "+(data as PerformerInterface).epoch + " "
                if (isNonEmptyString((data as PerformerInterface).email)) {
                    setCols = setCols + ", email = '" + (data as PerformerInterface).email + "' "
                }
                if (isNonEmptyString((data as PerformerInterface).phone)) {
                    setCols = setCols + ", phone = '" + (data as PerformerInterface).phone + "' "
                }
                break;
            case 'musical_piece':
                // don't wipe out data
                if (!isNonEmptyString((data as MusicalPieceInterface).printed_name) &&
                    !isNonEmptyString((data as MusicalPieceInterface).first_artist_id)
                ) {
                    return null
                }
                setCols = "printed_name = '"+(data as MusicalPieceInterface).printed_name.replaceAll("'","''").trim()+"'"
                setCols = setCols + ", first_composer_id = '"+(data as MusicalPieceInterface).first_artist_id+"'"
                if (isNonEmptyString((data as MusicalPieceInterface).all_movements)) {
                    setCols = setCols + ", all_movements = '" + (data as MusicalPieceInterface).all_movements.replaceAll("'","''").trim() + "' "
                }
                if (isNonEmptyString((data as MusicalPieceInterface).second_artist_id)) {
                    setCols = setCols + ", email = '" + (data as MusicalPieceInterface).second_artist_id + "' "
                }
                if (isNonEmptyString((data as MusicalPieceInterface).third_artist_id)) {
                    setCols = setCols + ", email = '" + (data as MusicalPieceInterface).third_artist_id + "' "
                }
                break;
        }

        const updateSQL="UPDATE "+table+" SET "+setCols+" WHERE id="+data.id
        const result = await connection.query(updateSQL)

        // Release the connection back to the pool
        connection.release();

        return result.rowCount
    } catch (error) {
        console.error('Error executing updateById:', error);
        throw error;
    }
}

export async function insertPerformancePieceMap(performancePieceMap: PerformancePieceInterface) {
    try {
        const connection = await pool.connect();

        let insertSQL = "INSERT INTO performance_pieces "
        if (performancePieceMap.movement != null) {
            insertSQL = insertSQL + "(performance_id, musical_piece_id, movement) "
            insertSQL = insertSQL + "VALUES ("+performancePieceMap.performance_id+", "+performancePieceMap.musical_piece_id+", '"+performancePieceMap.movement+"' )"
        } else {
            insertSQL = insertSQL + "(performance_id, musical_piece_id) "
            insertSQL = insertSQL + "VALUES ("+performancePieceMap.performance_id+", "+performancePieceMap.musical_piece_id+" )"
        }
        const result = connection.query(insertSQL);

        // Release the connection back to the pool
        connection.release();

        return result;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}

export async function deletePerformancePieceMap(performancePieceMap: PerformancePieceInterface, deleteAll: boolean=false) {
    try {
        const connection = await pool.connect();

        let deleteSQL = "DELETE FROM performance_pieces where performance_id = " + performancePieceMap.performance_id

        if (!deleteAll) {
            deleteSQL = deleteSQL + " AND musical_piece_id = " + performancePieceMap.musical_piece_id
        }

        const result = connection.query(deleteSQL);

        // Release the connection back to the pool
        connection.release();

        return result;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}

export async function deletePerformancePieceByPerformanceId(performance_id: number) {
    try {
        const connection = await pool.connect();

        const deleteSQL = "DELETE FROM performance_pieces where performance_id = " + performance_id
        const result = connection.query(deleteSQL);

        // Release the connection back to the pool
        connection.release();

        return result;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}

export async function updatePerformancePieceMap(performancePieceMap: PerformancePieceInterface) {
    const deleteAll: boolean = true;
    await deletePerformancePieceMap(performancePieceMap, deleteAll)
    await insertPerformancePieceMap(performancePieceMap)
}

export async function getClassLottery(class_name: string) {
    try {
        const connection = await pool.connect();

        const result = connection.query(
            "SELECT class_name, lottery"+
            "       FROM class_lottery"+
            "      WHERE class_name = '"+class_name+"'"
        );

        // Release the connection back to the pool
        connection.release();

        return result;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}

export async function updateClassLottery(class_name: string, lottery: number){
    try {
        const connection = await pool.connect();

        const updateSQL= "UPDATE class_lottery"+
            "        SET lottery = "+lottery+","+
            "        WHERE class_name = "+class_name

        const result = await connection.query(updateSQL)

        // Release the connection back to the pool
        connection.release()

        return result
    } catch (error) {
        console.error('Error executing query:', error);
        throw error
    }
}

export async function insertClassLottery(class_name: string, lottery: number){
    try {
        const connection = await pool.connect();

        const insertSQL= "INSERT INTO class_lottery"+
            "        (class_name, lottery) "+
            "        VALUES ('"+class_name+"', "+lottery+")"

        const result = await connection.query(insertSQL)

        // Release the connection back to the pool
        connection.release()

        return result
    } catch (error) {
        console.error('Error executing query:', error);
        throw error
    }
}

export async function deleteClassLottery(class_name: string) {
    try {
        const connection = await pool.connect();

        const deleteSQL= "DELETE FROM class_lottery WHERE class_name = '"+class_name+"'"

        const result = await connection.query(deleteSQL)

        // Release the connection back to the pool
        connection.release()
        return result
    } catch (error) {
        console.error('Error executing query:', error);
        throw error
    }
}


export async function queryPerformances(filters?: PerformanceFilterInterface) {
    /**
     *     id: number | null;
     *     musical_piece: string;
     *     movement: string
     *     composer: string - first composer could be several
     *     composer_years_active: string -first composer could be several
     *     composer2: string - mostly empty
     *     composer2_years_active: string - mostly empty
     *     composer3: string - almost always empty
     *     composer3_years_active: string -s almost always empty
     *     accompanist: string;
     *     duration: number;
     *     comment: string;
     *     instrument: string | null;
     *     performance_order: number default 100;
     *     concert_series: string (Eastside | Concerto Playoff);
     *     pafe_series: number of years of pafe
     *
     */
    try {
        const connection = await pool.connect();

        const fields = "performance.id, " +
            "            musical_piece.printed_name AS musical_piece,\n" +
            "            performance_pieces.movement,\n" +
            "            First.full_name AS composer, First.years_active AS composer_years_active,\n" +
            "            Second.full_name AS composer2, Second.years_active AS composer2_years_active,\n" +
            "            Third.full_name AS composer3, Third.years_active AS composer3_years_active,\n" +
            "            accompanist.full_name AS accompanist,\n" +
            "            performance.duration, performance.comment, performance.instrument,\n" +
            "            performance.performance_order, performance.concert_series, performance.pafe_series\n"
        const joins = " JOIN performance_pieces ON performance.id = performance_pieces.performance_id\n" +
            "        JOIN musical_piece ON performance_pieces.musical_piece_id = musical_piece.id\n" +
            "        JOIN composer First ON First.id = musical_piece.first_composer_id\n" +
            "        LEFT JOIN composer Second ON Second.id = musical_piece.second_composer_id\n" +
            "        LEFT JOIN composer Third ON Third.id = musical_piece.second_composer_id\n" +
            "        LEFT JOIN accompanist ON performance.accompanist_id = accompanist.id\n"
        const order = "ORDER BY performance.pafe_series, performance.concert_series, performance.performance_order"


        let queryFilter = ""
        if (typeof(filters) != "undefined" && Object.entries(filters).length > 0) {
            queryFilter = "WHERE "+Object.entries(filters)
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
                .filter(([_, value]) => value !== null) // filter out null values
              .map(([key, value]) => `${key} = ${typeof value === 'string' ? `'${value}'` : value}`)
                .join(' and ');
        }
        queryFilter = queryFilter + "\n";

        const result = connection.query(
            'SELECT '+fields+' FROM performance'+joins+queryFilter+order
        );


        // Release the connection back to the pool
        connection.release();

        return result;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}

export async function queryMusicalPieceByPerformanceId(id: number) {
    try {
        const connection = await pool.connect();
        const querySQL = "SELECT performance.id, musical_piece.printed_name, performance_pieces.movement, \n" +
          "one.full_name as composer_one_name, one.years_active as composer_one_years, \n" +
          "two.full_name as composer_two_name, two.years_active as composer_two_years, \n" +
          "three.full_name as composer_three_name, three.years_active as composer_three_years \n" +
          "FROM musical_piece\n" +
          "JOIN performance_pieces ON musical_piece.id = performance_pieces.musical_piece_id\n" +
          "JOIN composer one ON one.id = musical_piece.first_composer_id\n" +
          "LEFT JOIN composer two ON two.id = musical_piece. second_composer_id\n" +
          "LEFT JOIN composer three ON three.id = musical_piece. third_composer_id\n" +
          "JOIN performance ON performance_pieces.performance_id = performance.id\n" +
          "AND performance.id = " +id

        const result = connection.query(querySQL)
        connection.release();
        return result;
    } catch (error) {
        console.error('Error executing queryMusicalPieceByPerformanceId', error);
        throw error;
    }
}

export async function queryPerformanceDetailsById(id: number) {
    try {
        const connection = await pool.connect();
        const querySQL = "SELECT performance.performer_id, performer.full_name as performer_full_name, \n" +
          "performance.instrument, performer.epoch, accompanist.full_name as accompanist_name\n" +
          "FROM performance \n" +
          "JOIN performer ON performance.performer_id = performer.id \n" +
          "LEFT JOIN accompanist ON performance.accompanist_id = accompanist.id \n" +
          "WHERE performance.id = "+id
        const result = connection.query(querySQL)
        connection.release();
        return result;
    } catch (error) {
        console.error('Error executing queryPerformanceDetailsById', error);
        throw error;
    }
}

export async function searchComposer(composer_name: string) {
    try {
        const connection = await pool.connect();

        const searchSQL = "SELECT id, full_name, years_active, notes " +
            "FROM composer " +
            "WHERE full_name = '" + composer_name + "' OR LOWER(notes) = '" + composer_name.toLowerCase() + "'"

        const result = connection.query(searchSQL);

        // Release the connection back to the pool
        connection.release();

        return result;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}

export async function searchAccompanist(accompanist: string) {
    try {
        const connection = await pool.connect();

        const searchSQL = "SELECT id, full_name " +
            "FROM accompanist " +
            "WHERE LOWER(full_name) = '" + accompanist.toLowerCase() + "'"

        const result = connection.query(searchSQL);

        // Release the connection back to the pool
        connection.release();

        return result;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}

export async function searchPerformer(full_name: string, email: string | null, instrument: string) {
    try {
        const connection = await pool.connect();

        let searchSQL = "SELECT id, full_name, epoch, email, phone, instrument " +
            "FROM performer " +
            "WHERE (LOWER(full_name) = '" + full_name.toLowerCase() + "' AND instrument = '" + instrument + "') "
        if (email != null) {
            searchSQL = searchSQL + " OR (LOWER(email) = '" + email.toLowerCase() + "')"
        }

        const result = connection.query(searchSQL);

        // Release the connection back to the pool
        connection.release();

        return result;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}

export async function searchMusicalPiece(printed_name: string, first_composer_id: number) {
    try {
        const connection = await pool.connect();

        const searchSQL = "SELECT id, printed_name, first_composer_id, all_movements, second_composer_id, third_composer_id " +
            "FROM musical_piece " +
            "WHERE LOWER(printed_name) = '" + printed_name.toLowerCase().replaceAll("'","''").trim() +
            "' AND first_composer_id = " + first_composer_id

        const result = connection.query(searchSQL);

        // Release the connection back to the pool
        connection.release();

        return result;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}

export async function searchPerformanceByPerformer(performer_id: number, concert_series: string, pafe_series: number) {
    try {
        const connection = await pool.connect();

        const searchSQL = "SELECT performance.id, performer.full_name as performer_name, \n"+
            "musical_piece.printed_name as musical_piece_printed_name, \n"+
            "performance.performer_id, performance.performance_order, \n"+
            "performance.concert_series, performance.pafe_series, performance.duration, performance.accompanist_id, \n" +
            "performance.comment, performance.instrument, warm_up_room_name, warm_up_room_start, warm_up_room_end \n" +
            "FROM performance \n" +
            "JOIN performance_pieces ON performance.id = performance_pieces.performance_id \n" +
            "JOIN musical_piece ON performance_pieces.musical_piece_id = musical_piece.id \n" +
            "JOIN performer ON performance.performer_id = performer.id \n" +
            "WHERE performer_id = " + performer_id + "\n   "+
            "    AND LOWER(concert_series) = '" + concert_series.toLowerCase() + "' \n" +
            "    AND pafe_series = " + pafe_series

        const result = connection.query(searchSQL);

        // Release the connection back to the pool
        connection.release();

        return result;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}

export async function selectPerformanceLottery(pafe_series: number) {
    try {
        const connection = await pool.connect();

        const searchSQL = "SELECT class_lottery.lottery as lookupCode, \n" +
            "performer.full_name as fullName, \n" +
            "performer.epoch,  \n" +
            "performer.instrument, \n" +
            "composer.full_name as composer, \n" +
            "performer_ranked_choice.first_choice_time as first_choice_time, \n" +
            "performer_ranked_choice.concert_chair_choice as concert_chair_choice \n" +
            "FROM class_lottery \n" +
            "JOIN performance ON performance.class_name = class_lottery.class_name \n" +
            "JOIN performer ON performer.id = performance.performer_id \n" +
            "JOIN performance_pieces ON performance.id = performance_pieces.performance_id \n" +
            "JOIN musical_piece ON musical_piece.id = performance_pieces.musical_piece_id \n" +
            "JOIN composer ON musical_piece.first_composer_id = composer.id \n" +
            "LEFT JOIN performer_ranked_choice ON performer_ranked_choice.performer_id = performer.id \n" +
            "WHERE performance.pafe_series = "  + pafe_series + " \n" +
            "ORDER BY class_lottery.lottery"

        const result = connection.query(searchSQL)
        connection.release();
        return result;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}

export async function selectDBSchedule(performer_id: number) {
    try {
        const connection = await pool.connect();

        const selectSQL = "SELECT performer_id, concert_series, pafe_series, \n" +
            "first_choice_time, second_choice_time, third_choice_time, fourth_choice_time \n"+
            "FROM public.performer_ranked_choice \n" +
            "WHERE performer_id = " + performer_id + " \n" +
            "ORDER BY concert_series \n"

        const result = connection.query(selectSQL);
        connection.release();
        return result;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}

export async function createDBSchedule(performer_id : number,
                                       concert_series: string,
                                       pafe_series: number,
                                       first_concert_time: string,
                                       second_concert_time: string | null,
                                       third_concert_time: string | null,
                                       fourth_concert_time: string | null
) {
    try {
        const connection = await pool.connect();

        // first delete if exists, then insert, this handles new entries and updates
        const deleteSQL = "DELETE FROM performer_ranked_choice \n" +
          "WHERE performer_id = " + performer_id + "\n" +
          "  AND concert_series = '" + concert_series + "' \n"

        await connection.query(deleteSQL);

        let insertSQL = "INSERT INTO performer_ranked_choice "
        let insertCOLS = "(performer_id,concert_series,pafe_series,first_choice_time"
        let insertVALS = "VALUES ("+performer_id+", '"+concert_series+"', "+pafe_series+", '"+first_concert_time+"'"
        if (second_concert_time != null) {
            insertCOLS += ", second_choice_time"
            insertVALS += ", '"+second_concert_time+"'"
        }
        if (third_concert_time != null) {
            insertCOLS += ", third_choice_time"
            insertVALS += ", '"+third_concert_time+"'"
        }
        if (fourth_concert_time != null) {
            insertCOLS += ", fourth_choice_time"
            insertVALS += ", '"+fourth_concert_time+"'"
        }
        insertCOLS += ") \n"
        insertVALS += ") \n"
        insertSQL += insertCOLS + insertVALS

        const result = connection.query(insertSQL);
        connection.release();
        return result;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}

export async function retrievePerformanceByLottery(pafe_series: number) {
    try {
        const connection = await pool.connect();

        const querySQL =
          "SELECT performance.id, performance.performer_id, performance.performance_order, \n" +
          "performance.concert_series, performance.pafe_series, class_lottery.lottery as lookup_code, \n" +
          "class_lottery.lottery, \n" +
          "performer_ranked_choice.concert_chair_choice, performer_ranked_choice.first_choice_time, \n" +
          "performer_ranked_choice.second_choice_time, performer_ranked_choice.third_choice_time, \n" +
          "performer_ranked_choice.fourth_choice_time\n" +
          "FROM performance \n" +
          "JOIN class_lottery ON class_lottery.class_name = performance.class_name \n" +
          "JOIN performer_ranked_choice ON performance.performer_id = performer_ranked_choice.performer_id\n" +
          "        AND performance.pafe_series = performer_ranked_choice.pafe_series\n" +
          "        AND (performance.concert_series = performer_ranked_choice.concert_series\n" +
          "              OR performance.concert_series = 'Waitlist') \n" +
          "WHERE performance.pafe_series = " + pafe_series + "\n" +
          "ORDER BY performance.concert_series, class_lottery.lottery"

        const result = await connection.query(querySQL);

        connection.release();
        return result;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}

export async function updateProgramOrder(id: number, concertSeries:string, order:number) {
    try {
        const connection = await pool.connect();

        const updateSQL ="UPDATE performance \n" +
          "SET performance_order = "+order+", \n" +
          "concert_series = '"+concertSeries+"' \n" +
          "WHERE id = "+id+" \n"

        const result = await connection.query(updateSQL);

        connection.release();
        return result;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}

export async function movePerformanceByChair(id: number, performerId: number, pafeSeries: number, concertSeries:string, concertStart: string | null) {
   // moving in and out of waitlist
    try {
        const connection = await pool.connect();

        const updateSQL ="UPDATE performance \n" +
          "SET concert_series = '"+concertSeries+"' \n" +
          "WHERE id = "+id+" \n"

        await connection.query(updateSQL);

        // waitlist does not have concert start times
        if (concertSeries.toLowerCase() !== "waitlist" && concertStart != null) {
            const updateSQL ="UPDATE performer_ranked_choice \n" +
              "SET first_choice_time = '"+concertStart+"', \n" +
              "concert_chair_choice = "+true+" \n" +
              "WHERE performer_id = "+performerId+" \n" +
              "  AND pafe_series = "+pafeSeries+" \n" +
              "  AND concert_series = '"+concertSeries+"' \n"

            await connection.query(updateSQL);
        }

        connection.release();
        return true;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}