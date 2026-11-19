export type HouseholdPhoto = {
    id: number;
    household: number;
    photo: string;
    photo_type: string;
    created_at: string;
};

export type Personnel = {
    id: number;
    ad_soyad: string;
    unvan: string;
    telefon: string;
    aktif: boolean;
    created_at: string;
};

export type PersonnelInput = {
    ad_soyad: string;
    unvan?: string;
    telefon?: string;
    aktif?: boolean;
};

export type Household = {
    id: number;
    ad_soyad: string;
    tc_no: string;
    dosya_no: string;
    referans_no: string;
    telefon: string;
    adres: string;
    notlar: string;
    created_at: string;
    latitude: string | null;
    longitude: string | null;
    ziyareti_yapan_personel: number | null;
    ziyareti_yapan_personel_adi: string | null;
    ziyareti_yapan_personel_unvan: string | null;
    katilan_personel: number | null;
    katilan_personel_adi: string | null;
    photos: HouseholdPhoto[];
};

export type HouseholdInput = Pick<
    Household,
    "tc_no" | "ad_soyad" | "dosya_no" | "referans_no" | "telefon" | "adres" | "notlar"
> & {
    latitude: number | null;
    longitude: number | null;
    ziyareti_yapan_personel: number | null;
    katilan_personel: number | null;
};

export type RegisteredHousehold = {
    id: number;
    tc_no: string;
    ad: string;
    soyad: string;
    ad_soyad: string;
    dosya_no: string;
    referans_no: string;
    telefon: string;
    adres: string;
    updated_at: string;
};

export type HouseholdLookupResult = {
    tc_no: string;
    found_in_registered: boolean;
    registered_household: RegisteredHousehold | null;
    previous_visits: Household[];
};

export type RegisteredHouseholdStats = {
    total_registered_households: number;
    last_updated_at: string | null;
};

export type ExcelImportResult = {
    imported_count: number;
    created_count: number;
    updated_count: number;
    skipped_count: number;
    skipped_reasons: string[];
    total_registered_households: number;
    detected_columns: string[];
};

function householdsUrl() {
    return new URL(
        '/api/households/',
        process.env.API_BASE_URL ?? 'http://127.0.0.1:8000',
    );
}

function householdUrl(id: number) {
    return new URL(
        `/api/households/${id}/`,
        process.env.API_BASE_URL ?? 'http://127.0.0.1:8000',
    );
}

function photosUrl() {
    return new URL(
        '/api/photos/',
        process.env.API_BASE_URL ?? 'http://127.0.0.1:8000',
    );
}

function photoUrl(id: number) {
    return new URL(
        `/api/photos/${id}/`,
        process.env.API_BASE_URL ?? 'http://127.0.0.1:8000',
    );
}

export async function getHouseholds() {
    const response = await fetch(householdsUrl(), { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`Failed to load households: ${response.status} ${response.statusText}`);
    }

    const households = await response.json() as Household[];
    return households.map(normalizeHouseholdPhotoUrls);
}

export async function getHousehold(id: number) {
    const response = await fetch(householdUrl(id), { cache: 'no-store' });
    if (response.status === 404) {
        return null;
    }
    if (!response.ok) {
        throw new Error(`Failed to load household: ${response.status} ${response.statusText}`);
    }

    const household = await response.json() as Household;
    return normalizeHouseholdPhotoUrls(household);
}

export async function createHousehold(household: HouseholdInput) {
    const response = await fetch(householdsUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(household),
        cache: 'no-store',
    });

    if (!response.ok) {
        const errorDetails = await response.text();
        throw new Error(
            `Hane kaydedilemedi (${response.status}): ${errorDetails || response.statusText}`,
        );
    }

    return response.json() as Promise<Household>;
}

export async function updateHousehold(id: number, household: HouseholdInput) {
    const response = await fetch(householdUrl(id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(household),
        cache: 'no-store',
    });

    if (!response.ok) {
        const errorDetails = await response.text();
        throw new Error(
            `Hane bilgileri güncellenemedi (${response.status}): ${errorDetails || response.statusText}`,
        );
    }

    return response.json() as Promise<Household>;
}

export async function uploadHouseholdPhoto(
    householdId: number,
    photo: File,
    photoType?: string,
) {
    const formData = new FormData();
    formData.set('household', String(householdId));
    formData.set('photo', photo, photo.name);
    formData.set('photo_type', photoType && photoType !== 'auto' ? photoType : 'diger');
    formData.set('auto_classify', !photoType || photoType === 'auto' ? 'true' : 'false');

    const response = await fetch(photosUrl(), {
        method: 'POST',
        body: formData,
        cache: 'no-store',
    });

    if (!response.ok) {
        const errorDetails = await response.text();
        throw new Error(
            `Fotoğraf yüklenemedi (${response.status}): ${errorDetails || response.statusText}`,
        );
    }
}

export async function updateHouseholdPhotoType(
    id: number,
    photoType: string,
): Promise<HouseholdPhoto> {
    const response = await fetch(photoUrl(id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_type: photoType }),
        cache: 'no-store',
    });

    if (!response.ok) {
        const errorDetails = await response.text();
        throw new Error(
            `Fotoğraf etiketi güncellenemedi (${response.status}): ${errorDetails || response.statusText}`,
        );
    }

    return response.json() as Promise<HouseholdPhoto>;
}

export async function autoClassifyHouseholdPhotos(
    householdId: number,
): Promise<{ updated_count: number; total_checked: number }> {
    const url = new URL(
        '/api/photos/auto-classify/',
        process.env.API_BASE_URL ?? 'http://127.0.0.1:8000',
    );
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ household_id: householdId }),
        cache: 'no-store',
    });

    if (!response.ok) {
        const errorDetails = await response.text();
        throw new Error(
            `Yapay zeka etiketlemesi başarısız (${response.status}): ${errorDetails || response.statusText}`,
        );
    }

    return response.json() as Promise<{ updated_count: number; total_checked: number }>;
}

export async function deleteHouseholdPhoto(id: number) {
    const response = await fetch(photoUrl(id), {
        method: 'DELETE',
        cache: 'no-store',
    });

    if (!response.ok) {
        const errorDetails = await response.text();
        throw new Error(
            `Fotoğraf silinemedi (${response.status}): ${errorDetails || response.statusText}`,
        );
    }
}

export async function lookupHouseholdByTc(tcNo: string) {
    const url = new URL(
        '/api/households/lookup/',
        process.env.API_BASE_URL ?? 'http://127.0.0.1:8000',
    );
    url.searchParams.set('tc_no', tcNo.trim());

    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
        const errorDetails = await response.text();
        throw new Error(
            `TC Kimlik sorgulanamadı (${response.status}): ${errorDetails || response.statusText}`,
        );
    }

    const result = await response.json() as HouseholdLookupResult;
    return {
        ...result,
        previous_visits: result.previous_visits.map(normalizeHouseholdPhotoUrls),
    };
}

function normalizeHouseholdPhotoUrls(household: Household): Household {
    const apiBase = process.env.API_BASE_URL ?? 'http://127.0.0.1:8000';
    return {
        ...household,
        photos: household.photos.map((photo) => {
            const url = new URL(photo.photo, apiBase);
            return {
                ...photo,
                photo: `${url.pathname}${url.search}`,
            };
        }),
    };
}

export async function getRegisteredHouseholdStats(): Promise<RegisteredHouseholdStats> {
    const url = new URL(
        '/api/registered-households/stats/',
        process.env.API_BASE_URL ?? 'http://127.0.0.1:8000',
    );

    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
        return { total_registered_households: 0, last_updated_at: null };
    }

    return response.json() as Promise<RegisteredHouseholdStats>;
}

export async function importRegisteredHouseholdsExcel(file: File): Promise<ExcelImportResult> {
    const url = new URL(
        '/api/registered-households/import/',
        process.env.API_BASE_URL ?? 'http://127.0.0.1:8000',
    );
    const formData = new FormData();
    formData.set('file', file, file.name);

    const response = await fetch(url, {
        method: 'POST',
        body: formData,
        cache: 'no-store',
    });

    if (!response.ok) {
        let errorMessage = response.statusText;
        try {
            const errJson = (await response.json()) as { error?: string };
            if (errJson.error) {
                errorMessage = errJson.error;
            }
        } catch {
            const text = await response.text();
            if (text) {
                errorMessage = text;
            }
        }
        throw new Error(errorMessage);
    }

    return response.json() as Promise<ExcelImportResult>;
}

function personnelListUrl() {
    return new URL(
        '/api/personnel/',
        process.env.API_BASE_URL ?? 'http://127.0.0.1:8000',
    );
}

function personnelDetailUrl(id: number) {
    return new URL(
        `/api/personnel/${id}/`,
        process.env.API_BASE_URL ?? 'http://127.0.0.1:8000',
    );
}

export async function getPersonnelList(): Promise<Personnel[]> {
    const response = await fetch(personnelListUrl(), { cache: 'no-store' });
    if (!response.ok) {
        return [];
    }
    return response.json() as Promise<Personnel[]>;
}

export async function createPersonnel(input: PersonnelInput): Promise<Personnel> {
    const response = await fetch(personnelListUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        cache: 'no-store',
    });

    if (!response.ok) {
        const errorDetails = await response.text();
        throw new Error(
            `Personel eklenemedi (${response.status}): ${errorDetails || response.statusText}`,
        );
    }

    return response.json() as Promise<Personnel>;
}

export async function updatePersonnel(id: number, input: Partial<PersonnelInput>): Promise<Personnel> {
    const response = await fetch(personnelDetailUrl(id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        cache: 'no-store',
    });

    if (!response.ok) {
        const errorDetails = await response.text();
        throw new Error(
            `Personel güncellenemedi (${response.status}): ${errorDetails || response.statusText}`,
        );
    }

    return response.json() as Promise<Personnel>;
}

export async function deletePersonnel(id: number): Promise<void> {
    const response = await fetch(personnelDetailUrl(id), {
        method: 'DELETE',
        cache: 'no-store',
    });

    if (!response.ok) {
        const errorDetails = await response.text();
        throw new Error(
            `Personel silinemedi (${response.status}): ${errorDetails || response.statusText}`,
        );
    }
}
