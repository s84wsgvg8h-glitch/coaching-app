export type LimitlessAthleteSeed = {
  full_name: string;
  birth_date: string;
  member_number: string;
  competition_member_status: "groen" | "rood";
  student_status: "groen" | "rood";
  membership_type: "wedstrijd lid" | "beginnerslid";
};

function status(value: string): "groen" | "rood" {
  return value.toLowerCase().trim() === "ja" ? "groen" : "rood";
}

function membershipType(value: string): "wedstrijd lid" | "beginnerslid" {
  return value.toLowerCase().trim() === "ja" ? "beginnerslid" : "wedstrijd lid";
}

function athlete(
  full_name: string,
  member_number: string,
  birth_date: string,
  competition: string,
  student: string,
  membership: string,
): LimitlessAthleteSeed {
  return {
    full_name,
    member_number,
    birth_date,
    competition_member_status: status(competition),
    student_status: status(student),
    membership_type: membershipType(membership),
  };
}

export const limitlessAthletesSeed: LimitlessAthleteSeed[] = [
  athlete("Anass Raghi", "548439", "2004-10-12", "Ja", "Ja", "nee"),
  athlete("Aron Quartel", "551135", "2006-04-14", "Ja", "Ja", "nee"),
  athlete("Bart Kroon", "550849", "1997-05-08", "Ja", "Ja", "nee"),
  athlete("Bartosz Grzegorczyk", "551413", "2007-03-14", "Ja", "Ja", "nee"),
  athlete("Betty Aborah", "547678", "2002-09-13", "Ja", "Ja", "nee"),
  athlete("Casper den Broeder", "550536", "2004-05-07", "Ja", "Ja", "nee"),
  athlete("Daan Meijer", "548517", "2005-10-13", "Ja", "Ja", "nee"),
  athlete("Damaris Bredow", "548801", "2005-03-14", "Ja", "Ja", "nee"),
  athlete("Delaja Bredow", "550478", "2008-04-27", "Ja", "Ja", "nee"),
  athlete("Dimitri Bezuijen", "550355", "2004-01-10", "Ja", "Ja", "nee"),
  athlete("Fikri Zallali", "548435", "2005-03-09", "Ja", "Ja", "nee"),
  athlete("Floortje Sakkers", "549885", "2007-07-03", "Ja", "Ja", "nee"),
  athlete("Florian Bakker", "551491", "2009-07-29", "Ja", "Ja", "nee"),
  athlete("Hilin Shekho", "550468", "2007-03-27", "Ja", "Ja", "nee"),
  athlete("Jan van Oosten", "551052", "2008-01-09", "Ja", "Ja", "nee"),
  athlete("Jarl van den Berg", "551366", "2003-07-05", "Ja", "Ja", "nee"),
  athlete("Jayden Langezaal", "551172", "2008-08-15", "Ja", "Ja", "nee"),
  athlete("Joris Kool", "551040", "2002-11-25", "Ja", "Ja", "nee"),
  athlete("Joris van der Voorn", "549179", "1995-02-02", "Ja", "Ja", "nee"),
  athlete("Kayra Minkil", "551257", "2006-02-28", "Ja", "Ja", "ja"),
  athlete("Luka Gerrits", "550480", "2007-03-17", "Ja", "Ja", "nee"),
  athlete("Luke Koning", "549555", "2003-03-24", "Ja", "Ja", "nee"),
  athlete("Luna Urošević", "551116", "2009-06-25", "Ja", "Nee", "nee"),
  athlete("Masin Achghouyab", "549033", "2003-12-24", "Ja", "Ja", "nee"),
  athlete("Melvin Groenen", "551480", "2007-07-16", "Ja", "Ja", "nee"),
  athlete("Michelle Dijkman", "550096", "2005-08-17", "Ja", "Ja", "nee"),
  athlete("Milan Oudejans", "550525", "2009-12-03", "Ja", "Ja", "nee"),
  athlete("Miranda Ziekman", "547986", "1996-05-20", "Ja", "Ja", "nee"),
  athlete("Naadir Twahir", "547794", "2004-08-11", "Ja", "Ja", "nee"),
  athlete("Olivier Poulus", "549072", "2006-03-04", "Ja", "Ja", "nee"),
  athlete("Pepijn Olde Weghuis", "551336", "2008-10-31", "Ja", "Ja", "nee"),
  athlete("Rens Gorissen", "551049", "2003-08-23", "Ja", "Ja", "nee"),
  athlete("Renzo Mawloud", "550472", "2006-10-30", "Ja", "Ja", "nee"),
  athlete("Rick Elgershuizen", "547643", "2004-09-28", "Ja", "Ja", "nee"),
  athlete("Rosan Preuter", "551236", "2008-04-24", "Ja", "Ja", "nee"),
  athlete("Senna Leegwater", "551476", "2005-03-31", "Ja", "Ja", "nee"),
  athlete("Silas Palsrok", "551512", "2010-12-27", "Ja", "Ja", "nee"),
  athlete("Tjerry van Bronkhorst", "551393", "2005-08-29", "Ja", "Ja", "nee"),
  athlete("Viktor Qorri", "549804", "2009-02-08", "Ja", "Ja", "nee"),
  athlete("Vladyslav Tylikov", "550795", "2005-11-24", "Ja", "Ja", "nee"),
  athlete("Willem Reijnen", "549845", "2004-07-20", "Ja", "Ja", "ja"),
  athlete("Yagiz Temur", "550944", "2009-08-20", "Ja", "Ja", "nee"),
  athlete("Zacharias Overes", "551501", "2011-04-25", "Ja", "Ja", "nee"),
];
