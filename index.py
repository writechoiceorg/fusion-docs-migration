import os
import re


def transform_note_content(content):
    """
    Transform markdown image link within <Note> blocks into HTML within <Frame>.
    Example:
    [<Frame>![Alt Text](/path/to/image.png)</Frame>](https://link)
    becomes:
    <Frame><a href="https://link"><img src="/path/to/image.png" alt="Alt Text" /></a></Frame>
    """
    # Pattern to find the markdown link + image within <Frame>
    pattern = re.compile(
        r"\[<Frame>!\[([^\]]+)\]\(([^)]+)\)</Frame>\]\(([^)]+)\)", re.DOTALL
    )

    def repl(match):
        alt_text = match.group(1)
        img_src = match.group(2)
        link_href = match.group(3)
        return (
            f"<Frame>\n"
            f'  <a href="{link_href}" target="_blank">\n'
            f'    <div class="note-image-wrapper">\n'
            f'      <img noZoom src="{img_src}" alt="{alt_text}" class="note-image" />\n'
            f'      <img noZoom src="/images/play-btn.svg" alt="Play Button" class="note-image-overlay" />\n'
            f"    </div>\n"
            f"  </a>\n"
            f"</Frame>\n"
        )

    return pattern.sub(repl, content)


def process_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Pattern to find <Note> blocks
    note_pattern = re.compile(r"(<Note>)(.*?)(</Note>)", re.DOTALL)

    def note_repl(match):
        start_tag = match.group(1)
        note_body = match.group(2)
        end_tag = match.group(3)
        # Transform markdown image links inside the note body
        new_body = transform_note_content(note_body)
        return f"{start_tag}{new_body}{end_tag}"

    new_content = note_pattern.sub(note_repl, content)

    if new_content != content:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Updated: {filepath}")


def main(root_dir):
    for dirpath, _, filenames in os.walk(root_dir):
        for filename in filenames:
            if filename.lower().endswith(".mdx"):
                filepath = os.path.join(dirpath, filename)
                process_file(filepath)


if __name__ == "__main__":
    root_dir = "fusion-docs"
    main(root_dir)
