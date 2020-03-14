import { Config } from '@stencil/core';
import { sass } from '@stencil/sass';

export const config: Config = {
    namespace: "cdn",
    enableCache: false,
    hashFileNames: false,
    outputTargets:[
        {
            type: "dist"
        },
    ],
    plugins: [
        sass(),
    ],
};
