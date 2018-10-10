export const ALPHA = 0.125;
export const BETA = 0.25;
export const DETA = 6;


export function createRTOCalculater () {
    let RTTVAR;
    let SRTT;

    return {
        getFirstRTO (RTT) {
            SRTT = RTT;
            RTTVAR = RTT / 2;
            return SRTT + ALPHA * RTTVAR;
        },

        getRTO (RTT) {
            RTTVAR = (1 - BETA) * RTTVAR + BETA * Math.abs(RTT - SRTT);
            SRTT = SRTT + ALPHA * (RTT - SRTT);
            return SRTT + DETA * RTTVAR;
        }
    }
}