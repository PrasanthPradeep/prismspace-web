# Copyright 2026 Nobin Sijo (NobinSijo7T).
# SPDX-License-Identifier: Apache-2.0
import os
import json
import re
import time
from bs4 import BeautifulSoup, NavigableString

DOC_DIR = r"c:\Users\nobin\OneDrive\Documents\Projects\scraper\theatrejs_docs"
OUTPUT_FILE = os.path.join(DOC_DIR, "theatrejs_full_docs.json")

def clean_text_spacing(text):
    """Clean consecutive newlines and spaces."""
    text = re.sub(r'\r\n', '\n', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def html_to_markdown(node, indent_level=0, list_type=None, list_index=1):
    """Recursively convert BeautifulSoup node to Markdown."""
    if node is None:
        return ""
    
    if isinstance(node, NavigableString):
        return str(node)
        
    tag = node.name
    
    # Skip script, style, svg, and interactive media metadata that's not useful
    if tag in ['script', 'style', 'svg', 'path', 'g', 'polyline', 'line', 'noscript', 'iframe']:
        return ""
        
    # Code block detection (ch-codeblock)
    if tag == 'div' and 'ch-codeblock' in (node.get('class') or []):
        code_tag = node.find('code')
        if code_tag:
            line_divs = code_tag.find_all('div', recursive=False)
            if not line_divs:
                line_divs = code_tag.find_all('div')
            
            lines = []
            for line_div in line_divs:
                lines.append(line_div.get_text())
            code_text = "\n".join(lines)
        else:
            code_text = node.get_text()
            
        # Try to infer language
        lang = "javascript" # Default for Theatre.js
        text_lower = code_text.lower()
        if "npm install" in text_lower or "yarn install" in text_lower or "git clone" in text_lower or "yarn run" in text_lower:
            lang = "bash"
        elif "<editable" in text_lower or "<sheetprovider" in text_lower or "react" in text_lower:
            lang = "jsx"
            
        return f"\n\n```{lang}\n{code_text}\n```\n\n"
        
    # Headings
    if tag in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
        level = int(tag[1])
        parts = []
        for child in node.children:
            # Skip heading self-ref hash anchor links
            if child.name == 'a' and child.get('href', '').startswith('#') and child.get_text().strip() in ['#', '']:
                continue
            parts.append(html_to_markdown(child, indent_level))
        heading_text = "".join(parts).strip()
        heading_text = heading_text.lstrip('#').strip()
        return f"\n\n{'#' * level} {heading_text}\n\n"
        
    # Paragraph
    if tag == 'p':
        p_text = "".join(html_to_markdown(child) for child in node.children).strip()
        return f"\n\n{p_text}\n\n"
        
    # Bold / Strong
    if tag in ['strong', 'b']:
        text = "".join(html_to_markdown(child) for child in node.children)
        if text.strip():
            return f"**{text}**"
        return text
        
    # Italic / Emphasis
    if tag in ['em', 'i']:
        text = "".join(html_to_markdown(child) for child in node.children)
        if text.strip():
            return f"*{text}*"
        return text
        
    # Inline code
    if tag == 'code':
        text = node.get_text()
        return f"`{text}`"
        
    # Links
    if tag == 'a':
        text = "".join(html_to_markdown(child) for child in node.children).strip()
        href = node.get('href', '')
        if href:
            if href.startswith('/'):
                href = "https://www.theatrejs.com" + href
            return f"[{text}]({href})"
        return text
        
    # Lists
    if tag == 'ul':
        items = []
        for child in node.children:
            if child.name == 'li':
                items.append(html_to_markdown(child, indent_level + 1, 'ul'))
        return "\n" + "".join(items) + "\n"
        
    if tag == 'ol':
        items = []
        idx = 1
        for child in node.children:
            if child.name == 'li':
                items.append(html_to_markdown(child, indent_level + 1, 'ol', idx))
                idx += 1
        return "\n" + "".join(items) + "\n"
        
    if tag == 'li':
        content = "".join(html_to_markdown(child, indent_level) for child in node.children).strip()
        indent = "  " * (indent_level - 1)
        if list_type == 'ol':
            return f"{indent}{list_index}. {content}\n"
        else:
            return f"{indent}- {content}\n"
            
    # Tables
    if tag == 'table':
        thead = node.find('thead')
        tbody = node.find('tbody')
        
        md_table = []
        headers = []
        
        if thead:
            tr = thead.find('tr')
            if tr:
                headers = [html_to_markdown(th).strip().replace('\n', ' ') for th in tr.find_all(['th', 'td'])]
        else:
            first_tr = node.find('tr')
            if first_tr:
                headers = [html_to_markdown(th).strip().replace('\n', ' ') for th in first_tr.find_all(['th', 'td'])]
                
        if headers:
            md_table.append("| " + " | ".join(headers) + " |")
            md_table.append("| " + " | ".join(['---'] * len(headers)) + " |")
            
        rows = []
        if tbody:
            rows = tbody.find_all('tr')
        else:
            all_trs = node.find_all('tr')
            if all_trs:
                rows = all_trs[1:] if thead is None else all_trs
                
        for tr in rows:
            cells = [html_to_markdown(td).strip().replace('\n', ' ') for td in tr.find_all(['td', 'th'])]
            if cells:
                if len(cells) < len(headers):
                    cells += [''] * (len(headers) - len(cells))
                md_table.append("| " + " | ".join(cells) + " |")
                
        return "\n\n" + "\n".join(md_table) + "\n\n"
        
    # details & summary
    if tag == 'details':
        summary = node.find('summary')
        summary_text = html_to_markdown(summary).strip() if summary else "Details"
        content_parts = []
        for child in node.children:
            if child.name != 'summary':
                content_parts.append(html_to_markdown(child, indent_level))
        content_text = "".join(content_parts).strip()
        return f"\n\n<details>\n<summary>{summary_text}</summary>\n\n{content_text}\n\n</details>\n\n"
        
    if tag == 'summary':
        return "".join(html_to_markdown(child) for child in node.children)
        
    # Line break
    if tag == 'br':
        return "\n"
        
    # Image
    if tag == 'img':
        alt = node.get('alt', 'image')
        src = node.get('src', '')
        if src.startswith('/'):
            src = "https://www.theatrejs.com" + src
        return f"![{alt}]({src})"
        
    # Mux Player
    if tag == 'mux-player':
        pb_id = node.get('playback-id', '')
        if pb_id:
            return f"\n\n[Video Playback (Mux ID: {pb_id})](https://stream.mux.com/{pb_id})\n\n"
        return ""
        
    # Fallback to recursively processing children
    return "".join(html_to_markdown(child, indent_level) for child in node.children)


def clean_html_element(node):
    """Recursively clean HTML tag structure, leaving only semantic attributes."""
    if node is None:
        return None
        
    if isinstance(node, NavigableString):
        return str(node)
        
    tag = node.name
    if tag in ['script', 'style', 'svg', 'path', 'g', 'polyline', 'line', 'noscript', 'iframe']:
        return None
        
    # For code blocks, convert to semantic pre/code tags
    if tag == 'div' and 'ch-codeblock' in (node.get('class') or []):
        code_tag = node.find('code')
        if code_tag:
            line_divs = code_tag.find_all('div', recursive=False)
            if not line_divs:
                line_divs = code_tag.find_all('div')
            lines = [line.get_text() for line in line_divs]
            code_text = "\n".join(lines)
        else:
            code_text = node.get_text()
            
        new_pre = BeautifulSoup("", "html.parser").new_tag('pre')
        new_code = BeautifulSoup("", "html.parser").new_tag('code')
        new_code.string = code_text
        new_pre.append(new_code)
        return new_pre
        
    # Create new tag without cluttering attributes
    new_tag = BeautifulSoup("", "html.parser").new_tag(tag)
    
    if tag == 'a' and node.has_attr('href'):
        href = node['href']
        if href.startswith('/'):
            href = "https://www.theatrejs.com" + href
        new_tag['href'] = href
    elif tag == 'img':
        if node.has_attr('src'):
            src = node['src']
            if src.startswith('/'):
                src = "https://www.theatrejs.com" + src
            new_tag['src'] = src
        if node.has_attr('alt'):
            new_tag['alt'] = node['alt']
    elif tag == 'mux-player' and node.has_attr('playback-id'):
        new_tag['playback-id'] = node['playback-id']
        
    for child in node.children:
        cleaned_child = clean_html_element(child)
        if cleaned_child:
            new_tag.append(cleaned_child)
            
    return new_tag


def compile_docs():
    print("[INFO] Starting compilation and cleaning of Theatre.js Docs JSONs...")
    
    # Get all .json files in the directory
    all_files = [f for f in os.listdir(DOC_DIR) if f.endswith('.json')]
    
    # Filter files: exclude the compiled output file name if it already exists
    doc_files = [f for f in all_files if f != 'theatrejs_full_docs.json']
    print(f"Found {len(doc_files)} individual documentation JSON files.")
    
    pages = []
    
    for filename in sorted(doc_files):
        filepath = os.path.join(DOC_DIR, filename)
        print(f"  Processing {filename}...")
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            print(f"  [ERROR] Error reading {filename}: {e}")
            continue
            
        title = data.get('title', filename.replace('.json', '').replace('_', ' '))
        url = data.get('url', '')
        raw_html = data.get('raw_html', '')
        
        if not raw_html:
            print(f"  [WARNING] Warning: No raw_html in {filename}")
            continue
            
        soup = BeautifulSoup(raw_html, 'html.parser')
        
        # Locate the main prose content container
        prose_div = soup.find('div', class_='prose')
        if not prose_div:
            # Fallback to the main element if div.prose is not found
            prose_div = soup.find('main') or soup
            
        # Find feedback div and decompose it first to prevent root matching error
        feedback_div = prose_div.find(lambda tag: tag.name == 'div' and "Was this article helpful to you?" in tag.get_text())
        if feedback_div:
            feedback_div.decompose()
            
        # 1. Generate clean markdown
        body_markdown = html_to_markdown(prose_div)
        full_markdown = f"# {title}\n\n" + body_markdown
        cleaned_markdown = clean_text_spacing(full_markdown)
        
        # 2. Generate clean semantic HTML
        cleaned_prose_soup = clean_html_element(prose_div)
        if cleaned_prose_soup:
            body_html = str(cleaned_prose_soup)
        else:
            body_html = ""
        full_html = f"<h1>{title}</h1>\n{body_html}"
        
        # Add to pages list
        pages.append({
            "title": title,
            "url": url,
            "markdown": cleaned_markdown,
            "html": full_html
        })
        
    # Write compiled data into a single output JSON
    compiled_data = {
        "library": "Theatre.js",
        "version": "latest",
        "base_url": "https://www.theatrejs.com/docs/latest",
        "compiled_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total_pages": len(pages),
        "pages": pages
    }
    
    print(f"Writing compiled JSON to {OUTPUT_FILE}...")
    try:
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(compiled_data, f, indent=2, ensure_ascii=False)
        print(f"[SUCCESS] Successfully compiled {len(pages)} pages into {OUTPUT_FILE}!")
        print(f"   Final file size: {os.path.getsize(OUTPUT_FILE) / 1024:.2f} KB")
    except Exception as e:
        print(f"  [ERROR] Error writing output file: {e}")

if __name__ == "__main__":
    compile_docs()
