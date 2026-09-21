# Bhumi Nursing College — Complete Chapter-wise Digital Library

This package adds a course-wise syllabus/topic chapter map for:

- ANM — 2 academic years (INC annual structure)
- GNM — 3 academic years (INC annual structure)
- B.Sc Nursing — 8 semesters (INC semester structure)

The chapter map contains 701 syllabus-aligned study units/topics. It is not a reproduction of copyrighted textbook tables of contents or textbook chapters.

## Student view
Approved students are restricted to their own course. They can browse:
Course → Year → Semester (B.Sc) → Subject → Chapter → Uploaded resources.

## Admin view
Admin → Digital Library → choose Course, Year, Semester (if applicable), Subject, Chapter → upload PDF/notes/link.

When a chapter is selected while saving a material, the corresponding chapter record is created in Supabase automatically and the material is linked to it.

## Important
The chapter structure is a syllabus/topic map. It does not mean that a full textbook PDF is included. Only college-provided, licensed, public-domain, or official/open-access resources should be uploaded.

## Supabase
The migration `supabase/ALL_COURSES_CHAPTER_STRUCTURE.sql` creates the chapter table, RLS, grants, and the `chapter_id` link on `library_materials`. The live project has the chapter table and link installed.
