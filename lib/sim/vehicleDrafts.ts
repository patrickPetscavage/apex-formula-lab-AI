import {SF26_DEFAULT,validateSF26Setup,type SF26Setup} from './sf26Model';
let sf26:SF26Setup={...SF26_DEFAULT};
export function updateSF26Draft(value:SF26Setup){sf26={...value};}
export function currentSF26Draft(){return validateSF26Setup(sf26);}
