<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Service;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CatalogueSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            ['banking-financial', 'Banking & financial services', 'Explore service-outlet and financial business opportunities.', 'bank'],
            ['digital-seva-kendra', 'Digital Seva Kendra', 'Digital services for everyday customer needs.', 'payments'],
            ['business-opportunities', 'Business opportunities', 'Explore retailer, distributor and other business avenues.', 'business'],
            ['software-it', 'Software & IT solutions', 'Build websites, apps and software around your business.', 'code'],
            ['digital-marketing', 'Digital marketing & creative', 'Bring your brand into focus with marketing and creative services.', 'growth'],
        ];
        $catalogue = [
            'banking-financial' => [
                ['Bank CSP', 'Explore customer service point opportunities and ask for current bank-specific information.'],
                ['Insurance POSP ID', 'Explore insurance point-of-sales person ID information and onboarding requirements.'],
                ['Loan DSA ID', 'Ask about direct selling agent opportunities for loan-related services.'],
                ['Credit Card DSA ID', 'Explore credit-card direct selling agent service information.'],
                ['Digital Account Opening ID', 'Ask about service access for digital account opening assistance.'],
                ['White Label ATM', 'Discuss white-label ATM business information and current requirements.'],
            ],
            'digital-seva-kendra' => [
                ['AEPS', 'Explore Aadhaar-enabled payment service information for service outlets.'],
                ['DMT', 'Ask about domestic money transfer service access and current requirements.'],
                ['Micro ATM', 'Explore micro ATM service information for your customer service outlet.'],
                ['Mobile Recharge', 'Explore mobile recharge services for everyday customer needs.'],
                ['BBPS', 'Ask about bill payment service access and available biller information.'],
                ['PAN Services', 'Explore PAN-related service assistance and confirmed document requirements.'],
                ['IRCTC-related service', 'Ask about travel booking service information and the applicable authorized arrangement.'],
            ],
            'business-opportunities' => [
                ['Retailer ID', 'Explore a retailer service ID and the initial document checklist.'],
                ['Distributor ID', 'Explore distributor service opportunities and initial onboarding documents.'],
                ['Travel Agency ID', 'Discuss travel agency service ID information and current requirements.'],
                ['Mineral Water Plant', 'Explore information and consultation for a mineral water plant business.'],
                ['Solar Energy System', 'Discuss solar energy system options and your project requirements.'],
            ],
            'software-it' => [
                ['Website Development', 'Create a professional digital presence for your business.'],
                ['Mobile App Development', 'Discuss an Android or mobile application around your idea.'],
                ['Billing Software', 'Explore software to support billing and everyday business workflows.'],
                ['School Management System', 'Discuss software for school administration and communication needs.'],
                ['CRM Software', 'Explore customer relationship and sales workflow software.'],
                ['E-commerce Store', 'Discuss an online store that fits your products and business needs.'],
            ],
            'digital-marketing' => [
                ['Social Media Marketing', 'Plan a social media presence around your brand and audience.'],
                ['Facebook Marketing', 'Discuss marketing content and campaigns for Facebook.'],
                ['Instagram Marketing', 'Explore Instagram content and campaign services for your brand.'],
                ['Google Ads', 'Discuss advertising campaign requirements, budgets and scope.'],
                ['SEO', 'Explore search visibility and website optimization services.'],
                ['Graphic Design & Branding', 'Build a consistent visual identity and creative material.'],
                ['Video Editing', 'Discuss professional editing for your business videos.'],
                ['Reels Marketing', 'Explore short-form video content and campaign requirements.'],
            ],
        ];
        $featured = ['bank-csp', 'retailer-id', 'website-development', 'school-management-system', 'social-media-marketing', 'aeps'];
        foreach ($categories as $position => [$slug,$name,$summary,$icon]) {
            $category = Category::firstOrCreate(['slug' => $slug], compact('name', 'summary', 'icon') + ['sort_order' => $position, 'is_active' => true]);
            foreach ($catalogue[$slug] as $order => [$title,$short]) {
                $serviceSlug = Str::slug($title);
                $description = $short.' Global Link can discuss the available options and your requirements. Current availability, eligibility, fees, documents and processing details must be confirmed directly before you proceed.';
                $service = Service::firstOrCreate(['slug' => $serviceSlug], ['category_id' => $category->id, 'title' => $title, 'short_description' => $short, 'description' => $description, 'icon' => $icon, 'is_published' => true, 'featured' => in_array($serviceSlug, $featured, true), 'sort_order' => $position * 100 + $order, 'seo_title' => $title.' | Global Link Multiservice', 'seo_description' => $short]);
                $this->insertMissing('service_content_items', ['service_id' => $service->id, 'kind' => 'term', 'label' => 'Availability and terms must be confirmed before proceeding.'], ['body' => 'No guaranteed approval, income, activation time or outcome is promised. Provider labels do not establish an official partnership or authorization.', 'sort_order' => 0, 'created_at' => now(), 'updated_at' => now()]);
            }
        }
        $csp = Service::where('slug', 'bank-csp')->firstOrFail();
        foreach (['SBI' => 'SBI', 'BOB' => 'Bank of Baroda (BOB)', 'BOI' => 'Bank of India (BOI)', 'UNION' => 'Union Bank', 'IOB' => 'Indian Overseas Bank (IOB)', 'UCO' => 'UCO Bank', 'NSDL' => 'NSDL', 'HDFC' => 'HDFC'] as $order => $name) {
            $provider = DB::table('providers')->where('code', $order)->first();
            $id = $provider?->id ?? DB::table('providers')->insertGetId(['code' => $order, 'name' => $name, 'description' => 'Initial editable service label. Confirm availability and the authorized arrangement directly with Global Link.', 'is_active' => true, 'sort_order' => array_search($order, ['SBI', 'BOB', 'BOI', 'UNION', 'IOB', 'UCO', 'NSDL', 'HDFC'], true), 'created_at' => now(), 'updated_at' => now()]);
            $this->insertMissing('bank_service_details', ['service_id' => $csp->id, 'provider_id' => $id], ['created_at' => now(), 'updated_at' => now()]);
        }
        $documents = ['Current location', 'GPS Map Camera picture', 'Aadhaar card both-side clear copy', 'PAN card picture', 'Aadhaar-linked mobile number', 'Email address', 'Cancelled cheque / bank statement for commission account', 'Shop electricity bill', 'Shop agreement copy', 'Trade licence'];
        foreach (['retailer-id', 'distributor-id'] as $slug) {
            $id = Service::where('slug', $slug)->value('id');
            foreach ($documents as $order => $label) {
                $this->insertMissing('service_content_items', ['service_id' => $id, 'kind' => 'document', 'label' => $label], ['sort_order' => $order, 'body' => null, 'created_at' => now(), 'updated_at' => now()]);
            }
        }
        $settings = ['company_name' => 'GLOBAL LINK MULTISERVICE', 'phone' => '+91 62931 37235', 'email' => 'support@globallinkmultiservice.in', 'whatsapp' => '916293137235', 'address' => '', 'logo' => '', 'social_links' => '{}', 'footer' => 'Service information is subject to confirmation. No official bank partnership or guaranteed outcome is claimed.', 'seo_title' => 'Global Link Multiservice — Business possibilities, connected', 'seo_description' => 'Explore banking business services, Digital Seva, business opportunities, software and digital marketing with Global Link Multiservice.'];
        foreach ($settings as $key => $value) {
            if (! DB::table('site_settings')->where('key', $key)->exists()) {
                DB::table('site_settings')->insert(compact('key', 'value') + ['is_public' => true, 'created_at' => now(), 'updated_at' => now()]);
            }
        }
        $faqs = [['What services can I explore with Global Link?', 'Explore banking and financial business services, Digital Seva, business opportunities, software and IT, and digital marketing. The service catalogue has current published information.'], ['How do I get confirmed fees and eligibility?', 'Contact Global Link for the specific service. Prices, eligibility, required documents and processing times are not assumed when confirmed details are unavailable.'], ['Do bank names imply an official partnership?', 'No. Bank and provider names are initial editable service labels. Confirm the specific authorized arrangement and availability directly before proceeding.'], ['How can I discuss my business requirements?', 'Use the contact section to call, email or connect on WhatsApp. Do not submit identity documents or financial information through this website.']];
        foreach ($faqs as $order => [$question,$answer]) {
            $this->insertMissing('faqs', ['question' => $question, 'service_id' => null], ['answer' => $answer, 'is_active' => true, 'sort_order' => $order, 'created_at' => now(), 'updated_at' => now()]);
        }
    }

    private function insertMissing(string $table, array $keys, array $values): void
    {
        if (! DB::table($table)->where($keys)->exists()) {
            DB::table($table)->insert($keys + $values);
        }
    }
}
