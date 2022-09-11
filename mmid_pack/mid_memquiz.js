//Version 0.1: histogram = [{"R": "0 or 1", "time": timestamp, "T": cnt, "F": cnt}]
//difficulty = 1 - prob
//prob = 0.6 * prob(histogram[-1]) + 0.3 * prob(histogram[-2]) + 0.1 * prob(histogram[-3]) if len(histogram) == 3
//0.7 * prob(histogram[-1]) + 0.3 * prob(histogram[-2]) if len(histogram) == 2
//prob(histogram[-1])if len(histogram) == 1
//0 if len(histogram) == 0
//let x = 0.5 * result = 0.5 * #T/(#T + #F)
//let y = timestamp - now in s
//prob(subhistogram) = max(0, min(1, (5.243347634652E-11 * y * y -8.81304685652514E-06 * y + 0.590500152021891) * x))

function calc_difficulties_v_0_1(histogram){
    if(histogram == undefined)return 1.0;
    if(!histogram instanceof Array)alert("histogram is not an array!");
    if(histogram.length > 3)alert("shouldn't remeber so much!");
    var subprobs = [];
    for(var subhistogram of histogram){
        let x = 0.5 * subhistogram["R"] + 0.5 * subhistogram["T"] / (subhistogram["T"] + subhistogram["F"]);
        let y = (new Date().valueOf() - subhistogram["TIME"]) / 1000.0;
        let subprob =  (5.243347634652E-11 * y * y -8.81304685652514E-06 * y + 0.590500152021891) * x;
        if(subprob > 1)subprob = 1;
        else if(subprob < 0)subprob = 0;
        subprobs.push(subprob);
    }
    if(subprobs.length == 0){
        return 1.0;
    }else if(subprobs.length == 1){
        return 1.0 - subprobs[0];
    }else if(subprobs.length == 2){
        return 1.0 - 0.7 * subprobs[1] - 0.3 * subprobs[0];
    }else if(subprobs.length == 3){
        return 1.0 - 0.6 * subprobs[2] - 0.3 * subprobs[1] - 0.1 * subprobs[0];
    }
    return 1.0;
}