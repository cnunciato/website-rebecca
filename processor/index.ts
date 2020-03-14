import * as glob from "glob";
import * as mkdirp from "mkdirp";
import * as rimraf from "rimraf";
import * as path from "path";
import * as mime from "mime";
import * as moment from "moment-timezone";
import * as yaml from "yamljs";
import * as fs from "fs";
import * as request from "request";

import { exiftool, ExifDateTime, Tags } from "exiftool-vendored";
import { execSync } from "child_process";

interface PhotoItem {
    title: string;
    date: Date;
    draft: boolean;
    description?: string
    photo: {
        url: string;
        thumb?: string;
        preview?: string;
        created: Date;
        exif?: EXIFData;
        title?: string;
        caption?: string;
    };
    links: Link[];
}

interface VideoItem {
    title: string;
    date: Date;
    draft: boolean;
    description?: string;
    video: {
        url: string;
        thumb?: string;
        preview?: string;
        poster?: string;
        created: Date;
        exif?: EXIFData;
        title?: string;
        caption?: string;
        controls: boolean;
        duration?: number;
    };
    links: Link[];
}

interface SoundItem {
    title: string;
    date: Date;
    draft: boolean;
    description?: string;
    sound: {
        url: string;
        thumb?: string;
        preview?: string;
        duration?: number;
    };
    links: Link[];
}

type MediaItem = PhotoItem | VideoItem | SoundItem & {
    drop: boolean;
};

interface ProcessingResult {
    type: "photo" | "video" | "sound";
    title: string | undefined;
    caption: string | undefined;
    created: Date;
    url: string;
    filename: string | undefined;
    preview?: string;
    thumb?: string;
    poster?: string;
    duration?: number;
    exif?: EXIFData;
}

interface Link {
    name: string;
    url: string;
}

interface EXIFData {
    make: string | undefined,
    model: string | undefined,
    lens: string | undefined,
    iso: number | undefined,
    aperture: number | undefined,
    shutter_speed: string | undefined,
    focal_length: string | undefined,
    gps: string | undefined,
}

interface ContentFile {
    path: string;
    frontmatter: MediaItem;
    content: string;
}

// The S3 home of all website media.
const mediaBucket = "rlnunciato-website-media";

// An optional source path.
const source = process.argv[2];

if (source) {

    if (source.startsWith("s3://")) {

        // Make an empty working directory.
        rimraf.sync("./workdir");
        mkdirp.sync("./workdir");

        // Download the file from S3 into the working directory.
        console.log(`⬆️️ Downloading ${source} ...`);
        execSync(`aws s3 cp ${source} ./workdir`);

        // Pull the filename out of the URL.
        const sourceFilename = source.split("/").slice(-1)[0];

        // TODO: Figure out some way to extract titles here, so everything doesn't have to be Untitled.
        const title = "Untitled";

        processFiles("./workdir", true)
            .then(results => {

                results.forEach(item => {

                    if (!item) {
                        throw new Error(`💥 Media item was ${item}.`);
                    }

                    // The drop item type, based on the MIME-type of the submission.
                    const fileType = fileToItemType(sourceFilename);

                    if (!fileType) {
                        throw new Error(`💥 Unable to determine MIME type for ${sourceFilename}.`);
                    }

                    // The frontmatter for the item.
                    let frontmatter: MediaItem | undefined;

                    // The repo-relative path for the GitHub submission.
                    let relativePath: string | undefined;

                    switch (fileType) {
                        case "video":
                            relativePath = `site/content/videos/${item.filename}.md`;

                            frontmatter = {
                                title,
                                date: item.created,
                                draft: false,
                                drop: true,
                                video: {
                                    url: item.url,
                                    thumb: item.thumb,
                                    preview: item.preview,
                                    poster: item.poster,
                                    created: item.created,
                                    exif: item.exif,
                                    title: item.title,
                                    caption: item.caption,
                                    controls: true,
                                    duration: item.duration,
                                },
                                links: [],
                            };
                            break;
                        case "photo":
                            relativePath = `site/content/photos/${item.filename}.md`;

                            frontmatter = {
                                title,
                                date: item.created,
                                draft: false,
                                drop: true,
                                photo: {
                                    url: item.url,
                                    thumb: item.thumb,
                                    preview: item.preview,
                                    created: item.created,
                                    exif: item.exif,
                                    title: item.title,
                                    caption: item.caption,
                                },
                                links: [],
                            };
                            break;
                        case "sound":
                            relativePath = `site/content/sounds/${item.filename}.md`;

                            frontmatter = {
                                title,
                                date: item.created,
                                draft: false,
                                drop: true,
                                sound: {
                                    url: item.url,
                                    duration: item.duration,
                                },
                                links: [],
                            };
                            break;
                    }

                    if (!frontmatter || !relativePath) {
                        throw new Error(`💥 Unable to derive frontmatter or relativePath from processFiles result: ${toJSON(results)}.`);
                    }

                    // Submit the new content file to GitHub.
                    submitToGitHub({ path: relativePath, frontmatter, content: "" })
                        .then(() => {
                            console.log("🍕 Woohoo! Done.");
                        });
                    });
            })
            .catch(error => console.error(error))
            .finally(() => exiftool.end());

    } else {

        // Just pricess and write the resulting JSON or YAML to stdout.
        processFiles(source, true)
            .then(result => console.log(result))
            .catch(error => console.error(error))
            .finally(() => exiftool.end());
    }
}

// Submit a new content file to GitHub.
function submitToGitHub(file: ContentFile): Promise<any> {
    const username = process.env.USER || "cnunciato";
    const repo = process.env.REPO || "cnunciato/website-rebecca";
    const gitUsername = process.env.GIT_USER_NAME || "cnunciato";
    const gitEmail = process.env.GIT_USER_EMAIL || "c@nunciato.org";
    const userAgent = process.env.GITHUB_USER_AGENT || "Christian's Media-Processor Uploader Service Thing";
    const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;

    console.log(`➡️ Sending to GitHub: ${file.path}, ${toJSON(file.frontmatter)}, ${file.content}...`);

    return new Promise((resolve, reject) => {

        // Convert frontmatter to YAML and append content, if any.
        const yamlContent = `---\n${toYAML(file.frontmatter)}---\n\n${file.content.trim()}`;

        // Send it all to GitHub.
        request
            .put(`https://api.github.com/repos/${repo}/contents/${file.path}`, {
                headers: {
                    "User-Agent": userAgent,
                },
                auth: {
                    username,
                    password: token,
                },
                json: {
                    message: "Add a drop item",
                    committer: {
                        name: gitUsername,
                        email: gitEmail,
                    },
                    content: Buffer.from(yamlContent).toString('base64'),
                },

            }, (error, response) => {

                if (error) {
                    console.error("💥 Error submitting to GitHub: ", error);
                    reject(error);
                    return;
                }

                console.log("🙌  Aww yeah:", response.body);
                resolve(response);
            });
    });
}

// The thing that does the thing.
function processFiles(sourceDir: string, useGPS: boolean): Promise<(ProcessingResult | null)[]> {
    const processed = `${sourceDir}/Out`;
    const mediaPath = `${processed}/media`
    const imagesPath = `${mediaPath}/images`;
    const videoPath = `${mediaPath}/video`;
    const audioPath = `${mediaPath}/audio`;
    const thumbPath = `${mediaPath}/thumbs`;
    const previewPath = `${mediaPath}/previews`;
    const posterPath = `${mediaPath}/posters`;

    const thumbWidth = 320;
    const previewWidth = 800;
    const largeWidth = 1600;

    const output: ProcessingResult[] = [];

    rimraf.sync(processed);
    mkdirp.sync(processed);
    mkdirp.sync(mediaPath);
    mkdirp.sync(imagesPath);
    mkdirp.sync(videoPath);
    mkdirp.sync(audioPath);
    mkdirp.sync(thumbPath);
    mkdirp.sync(previewPath);
    mkdirp.sync(posterPath);

    const files = glob.sync(`${sourceDir}/**/*.*`);

    return new Promise<ProcessingResult[]>((resolve, reject) => {
        return Promise
            .all(files.map(file => exiftool.read(file)))
            .then(results => {

                for (let i = 0; i < results.length; i++) {
                    const file = files[i];
                    const tags = results[i];

                    // The filename (which has no extension here) we'll use for the Markdown file and
                    // all derived media. It takes the form `YYYY-MM-DD-hh-mm-ss`.
                    const filename = tagsToFilename(results[i]);

                    // The type of submission (photo, video, sound), derived from the file path and MIME type.
                    const type = fileToItemType(file);

                    if (!filename) {
                        console.error(`🤔 Couldn't derive a filename for ${file}. Skipping.`);
                        continue;
                    }

                    if (!type) {
                        console.error(`🤔 Couldn't derive a submission type for ${file}. Skipping.`);
                        continue;
                    }

                    // The extension to use for the rendered item. For photos, this is always JPG;
                    // for videos, we want to have ffmpeg render MP4s, and for audio, it's M4A.
                    let extension: string;

                    // The S3 folder to which the file will be uploaded.
                    let s3Path: string;

                    // Set the target extension and path based on the item type.
                    if (type === "photo") {
                        extension = "jpg";
                        s3Path = "images";
                    } else if (type === "video") {
                        extension = "mp4";
                        s3Path = "video";
                    } else if (type === "sound") {
                        extension = "m4a";
                        s3Path = "audio";
                    } else {
                        console.error(`🤔 Unprocessable type for ${file} (It was ${type}). Skipping.`);
                        continue;
                    }

                    // The file we'll be generating. This refers to the
                    const mediaFilename = `${filename}.${extension}`;

                    console.log("⏱ Processing...");

                    // Derive an ExifDate from the tags provided. Here, this is used to set the
                    // item creation date as an actual JavaScript date, so it can ultimately be
                    // rendered properly by the Hugo template.
                    const date = tagsToCreated(tags);

                    if (!date) {
                        console.log("Tags:", tags);
                        reject(new Error("😢 No date detected. See above for the tags."));
                        return;
                    }

                    const metadata: ProcessingResult = {
                        type: type,
                        title: tags.Title,
                        caption: tags.Description,
                        created: moment.tz(date.toDate(), "America/Los_Angeles").toDate(),
                        filename,

                        // This assumes the main/large asset will always have the same
                        // extension as the original, which we may not want.
                        url: `s3/${s3Path}/${mediaFilename}`,
                    }

                    if (type === "photo" || type === "video") {
                        Object.assign(metadata, {
                            preview: `s3/previews/${filename}.jpg`,
                            thumb: `s3/thumbs/${filename}.jpg`,
                            exif: {
                                make: tags.Make,
                                model: tags.Model,
                                lens: tags.LensModel,
                                iso: tags.ISO,
                                aperture: tags.ApertureValue,
                                shutter_speed: tags.ShutterSpeed,
                                focal_length: tags.FocalLength,
                                gps: useGPS ? tags.GPSPosition : undefined,
                            },
                        });
                    }

                    if (type === "photo") {

                        // iPhone photos are weird. When they're vertically oriented, they aren't, like, _really_
                        // vertically oriented; they're horizontally oriented, but their _metadata_ says they're vertical,
                        // and some (but not all) browsers and image viewers attempt to honor this, which is just annoying.
                        // Exiftran is a great little tool that simply rotates the photo losslessly and corrects the metadata
                        // tag, making everyone happy, expecially me. https://linux.die.net/man/1/exiftran
                        execSync(`exiftran -a -i ${file}`);

                        // Make thumbs and things.
                        makeResizedImage(file, path.join(imagesPath, mediaFilename), largeWidth);
                        makeResizedImage(file, path.join(previewPath, mediaFilename), previewWidth);
                        makeResizedImage(file, path.join(thumbPath, mediaFilename), thumbWidth);
                    }

                    if (type === "video") {
                        const duration = getMediaDuration(file);

                        // Scale and bracket the video with simple A/V transitions (fade in, fade out).
                        execSync(`ffmpeg -i "${file}" -vf "fade=in:0:30,fade=out:st=${duration - 1}:d=1,scale=${largeWidth}:-1" -af "afade=in:st=0:d=1,afade=out:st=${duration - 1}:d=1" -vcodec h264 -acodec aac -strict -2 "${videoPath}/${mediaFilename}"`);

                        // Make static imagery.
                        makeVideoThumbnail(file, path.join(previewPath, filename), previewWidth);
                        makeVideoThumbnail(file, path.join(thumbPath, filename), thumbWidth);
                        makeVideoThumbnail(file, path.join(posterPath, filename), largeWidth);

                        Object.assign(metadata, {
                            duration,
                            poster: `s3/posters/${filename}.jpg`,
                        });
                    }

                    if (type === "sound") {
                        const duration = getMediaDuration(file);

                        // Fade sounds in and out as well. Note that we're still passing
                        // mediaFilename here, which contains the extension of the
                        // original, rather than the format we mean to convert to.
                        makeSound(file, path.join(audioPath, mediaFilename), duration);

                        Object.assign(metadata, {
                            duration,
                        });
                    }

                    output.push(metadata);
                }
            })
            .then(() => {
                console.log("\n---------------------------------------------------------------------------------\n");

                // Write the output files.
                console.log(`📝 Writing ${processed}/out.json ...`);
                fs.writeFileSync(`${processed}/out.json`, JSON.stringify(output, null, 4));
                console.log(`📝 Writing ${processed}/out.yaml ...`);
                fs.writeFileSync(`${processed}/out.yaml`, toYAML(output));

                // Upload to S3.
                console.log(`⬆️ Uploading ${output.length} objects to S3...`);
                execSync(`aws s3 sync ${mediaPath} s3://${mediaBucket}`);

                // Report.
                console.log(`📸 ${output.length} objects processed.`);
                console.log("🍻 Done.")
                resolve(output);
            })
            .catch(error => {
                console.error("💥 Processing error! ", error);
                reject(error);
            });
    })
}

// Get the duration, in seconds, of a video.
function getMediaDuration(path: string): number {
    return parseInt(execSync(`ffprobe -i "${path}" -show_entries stream=codec_type,duration -of compact=p=0:nk=1 | head -1`).toString().trim().split("|").slice(-1)[0]);
}

// Resize an image.
function makeResizedImage(source: string, destination: string, width: number) {
    execSync(`ffmpeg -i "${source}" -vf "scale=${width}:-1" -pix_fmt yuvj422p -q:v 4 -y "${destination}"`);
}

// Make a video thumbnail.
function makeVideoThumbnail(source: string, destination: string, width: number) {
    execSync(`ffmpeg -i "${source}" -vf "select=gte(n\\,100),scale=${width}:-1" -vframes 1 "${destination}.jpg"`);
}

// Make a sound clip.
function makeSound(source: string, destination: string, duration: number) {
    execSync(`ffmpeg -i "${source}" -vf "fade=in:0:30,fade=out:st=${duration - 1}:d=1" -af "afade=in:st=0:d=1,afade=out:st=${duration - 1}:d=1" -acodec aac -strict -2 "${destination}"`);
}

// Given some tags, return an EXIF date and time.
function tagsToCreated(tags: Tags): ExifDateTime | undefined {
    console.log("Tags: ", tags);

    // Note that CreationDate is present with iOS videos, but is apparently not recognized by exiftool-vendored,
    // which seems strange, and suggests some looking-into. (TODO: Find out if there's a better way to do this.)
    return (tags.DateTimeCreated || tags.DateCreated || tags.DateTimeOriginal || tags["CreationDate"]) as ExifDateTime;
}

// Generate a filename based on date-oriented tags. E.g., `YYYY-MM-DD-hh-mm-ss`.
function tagsToFilename(tags: Tags): string | undefined {
    const created = tagsToCreated(tags);

    if (!created || !created.rawValue) {
        return undefined;
    }

    return [
        created.year,
        created.month,
        created.day,
        created.hour,
        created.minute,
        created.second,
    ]
    .map(n => n.toString().length < 4 ? `0${n}`.slice(-2) : n)
    .join("-");
}

// Generate a filename (sans extension) from an optional JavaScript date. Defaults to now.
function dateToFilename(date?: Date): string {
    return moment(date).format("YYYY-MM-DD-hh-mm-ss");
}

// Derive the submission type.
function fileToItemType(path: string): "photo" | "video" | "sound" | undefined {
    const mimeType = mime.getType(path);

    if (mimeType) {
        const [ type ] = mimeType.split("/");

        switch (type) {
            case "image":
                return "photo";
            case "video":
                return "video";
            case "audio":
            case "application":
                return "sound";
        }
    }

    return undefined;
}

// Convert JSON to YAML.
function toYAML(json: any, inline = 4, indent = 2): string {
    return yaml.stringify(json, inline, indent);
}

// Pretty-print some JSON.
function toJSON(obj: any): string {
    return JSON.stringify(obj, null, 4);
}
