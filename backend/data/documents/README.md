# Course document storage

This directory holds runtime document files and the generated document registry. Personal uploads belong in `user_uploads/` and must not be committed.

Only a trusted administrator should add course material to `official/`. Review each source and confirm that it is part of the course before adding a PDF, Markdown, or text file. The backend indexes new files from that folder on startup. Files in this folder are treated as the official corpus by the application; that label does not mean the application independently verifies their contents.

Public upload requests are always stored as private user notes and cannot write to the official corpus.
