import { ResponseType } from './../enums/response-type.enum';
export interface IEventCallback {
    type: ResponseType;
    Data: any;
}

export class EventCallback {
    constructor(public type: ResponseType, public Data: any) {

    }
}