from PyPDF2 import PdfReader, PdfWriter

def split_pdf_custom(input_path):
    reader = PdfReader(input_path)
    total_pages = len(reader.pages)

    print(f"Total pages: {total_pages}")
    user_input = input("Enter ending pages (comma-separated): ")

    split_points = [int(x.strip()) for x in user_input.split(",")]

    start = 0

    for idx, end_page in enumerate(split_points):
        writer = PdfWriter()
        end = min(end_page, total_pages)

        try:
            for i in range(start, end):
                writer.add_page(reader.pages[i])

            output_filename = f"module_{idx}.pdf"
            with open(output_filename, "wb") as f:
                writer.write(f)

            print(f"Created: {output_filename} ({start+1}-{end})")

        except Exception as e:
            print(f"Error at module {idx} (pages {start+1}-{end}): {e}")
            break

        start = end

    print("Done.")
    
split_pdf_custom("OS_Endsem.pdf")