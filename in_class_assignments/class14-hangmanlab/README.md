# Class 14: Hangman REST API Lab

## Layout

```
class14-hangmanlab/
├── report_editor.html      # fill in answers here, then Save as PDF
├── make_zip.sh             # checks files and builds hangman_lab.zip
└── hangman_lab/            # exactly what gets submitted
    ├── hangman_client.py
    ├── lab_report.pdf      # you create this from the editor
    └── screenshots/
        ├── create_game.png
        ├── guess_letter.png
        └── python_client.png
```

## Workflow

1. Open `report_editor.html` in Chrome. From Windows, the path is
   `\\wsl.localhost\Ubuntu\home\ajgre\CSE4095_2026\in_class_assignments\class14-hangmanlab\report_editor.html`
   (or run `explorer.exe .` in this folder and double click it).
2. Type answers. They autosave in the browser. Use **Export JSON** now and then for a backup file.
3. Save screenshots into `hangman_lab/screenshots/` with the exact names above, then click **Reload images**.
4. Click **Preview** to check the layout, then **Save as PDF** and save it as `hangman_lab/lab_report.pdf`.
   In the print dialog pick "Save as PDF" and turn off "Headers and footers".
5. Run `./make_zip.sh` to build `hangman_lab.zip`.
