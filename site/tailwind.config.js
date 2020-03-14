const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {

    theme: {

        extend: {

            fontFamily: {

                sans: [
                    "rooney-sans",
                    ...defaultTheme.fontFamily.sans,
                ],

                serif: [
                    "rooney-web",
                    ...defaultTheme.fontFamily.serif,
                ],

                mono: [
                    "source-code-pro",
                    ...defaultTheme.fontFamily.mono,
                ]
            },
        },
    },
    variants: {

    },
    plugins: [

    ],
};
