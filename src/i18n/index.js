const fs = require("fs");
const path = require("path");
const i18next = require("i18next");

const TRANSLATIONS_DIR = path.join(__dirname);

function listLocaleDirectories() {
    return fs.readdirSync(TRANSLATIONS_DIR, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();
}

function loadJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function loadResources() {
    const locales = listLocaleDirectories();
    const resources = {};
    const namespaces = new Set();

    for (const locale of locales) {
        const localeDir = path.join(TRANSLATIONS_DIR, locale);
        const files = fs.readdirSync(localeDir)
            .filter((file) => file.endsWith(".json"))
            .sort();

        resources[locale] = {};

        for (const file of files) {
            const namespace = path.basename(file, ".json");
            namespaces.add(namespace);
            resources[locale][namespace] = loadJson(path.join(localeDir, file));
        }
    }

    return {
        resources,
        namespaces: [...namespaces].sort()
    };
}

function createI18nInstance() {
    const { resources, namespaces } = loadResources();
    const instance = i18next.createInstance();

    instance.init({
        resources,
        lng: "ar",
        fallbackLng: false,
        initImmediate: false,
        interpolation: {
            escapeValue: false
        },
        defaultNS: "common",
        ns: namespaces
    });

    return instance;
}

function collectLeafPaths(value, currentPath = "") {
    if (typeof value === "string") {
        return [currentPath];
    }

    if (Array.isArray(value)) {
        return value.flatMap((entry, index) => collectLeafPaths(entry, `${currentPath}[${index}]`));
    }

    if (value && typeof value === "object") {
        return Object.entries(value).flatMap(([key, entry]) => {
            const nextPath = currentPath ? `${currentPath}.${key}` : key;
            return collectLeafPaths(entry, nextPath);
        });
    }

    throw new Error(`Invalid translation value at "${currentPath || "<root>"}". Expected string, array, or object.`);
}

function getParityErrors(resources) {
    const locales = Object.keys(resources).sort();
    if (locales.length === 0) {
        return ["No translation locales were found."];
    }

    const [baselineLocale, ...otherLocales] = locales;
    const baselineNamespaces = Object.keys(resources[baselineLocale]).sort();
    const errors = [];

    for (const locale of locales) {
        const localeNamespaces = Object.keys(resources[locale]).sort();
        const missingNamespaces = baselineNamespaces.filter((namespace) => !localeNamespaces.includes(namespace));
        const extraNamespaces = localeNamespaces.filter((namespace) => !baselineNamespaces.includes(namespace));

        for (const namespace of missingNamespaces) {
            errors.push(`Locale "${locale}" is missing namespace "${namespace}".`);
        }

        for (const namespace of extraNamespaces) {
            errors.push(`Locale "${locale}" has extra namespace "${namespace}".`);
        }
    }

    for (const namespace of baselineNamespaces) {
        const baselineKeys = collectLeafPaths(resources[baselineLocale][namespace]).sort();

        for (const locale of otherLocales) {
            if (!resources[locale][namespace]) {
                continue;
            }

            const localeKeys = collectLeafPaths(resources[locale][namespace]).sort();
            const missingKeys = baselineKeys.filter((key) => !localeKeys.includes(key));
            const extraKeys = localeKeys.filter((key) => !baselineKeys.includes(key));

            for (const key of missingKeys) {
                errors.push(`Locale "${locale}" is missing key "${namespace}:${key}".`);
            }

            for (const key of extraKeys) {
                errors.push(`Locale "${locale}" has extra key "${namespace}:${key}".`);
            }
        }
    }

    return errors;
}

function validateResources() {
    const { resources } = loadResources();
    const errors = getParityErrors(resources);

    if (errors.length > 0) {
        throw new Error(`Translation validation failed:\n${errors.join("\n")}`);
    }

    return resources;
}

function getLocaleConfig(locale) {
    return locale === "en"
        ? { lang: "en", dir: "ltr", label: "English" }
        : { lang: "ar", dir: "rtl", label: "العربية" };
}

function localizeUrl(url, locale) {
    if (!url || typeof url !== "string") {
        return locale === "en" ? "/en/" : "/";
    }

    const normalized = url === "/" ? "/" : url.replace(/\/+$/, "") + "/";

    if (locale === "en") {
        if (normalized === "/") {
            return "/en/";
        }

        return normalized.startsWith("/en/") ? normalized : `/en${normalized}`;
    }

    if (normalized === "/en/") {
        return "/";
    }

    return normalized.startsWith("/en/") ? normalized.replace(/^\/en/, "") || "/" : normalized;
}

module.exports = {
    createI18nInstance,
    getLocaleConfig,
    loadResources,
    localizeUrl,
    validateResources
};
