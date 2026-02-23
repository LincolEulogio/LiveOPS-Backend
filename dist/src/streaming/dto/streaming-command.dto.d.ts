export type JsonValue = string | number | boolean | null | {
    [key: string]: JsonValue;
} | JsonValue[];
export declare class StreamingCommandDto {
    type: string;
    sceneName?: string;
    payload?: JsonValue;
}
